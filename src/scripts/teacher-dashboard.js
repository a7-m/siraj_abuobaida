import { authService } from '../services/auth.js';
import { supabase } from '../services/supabase.js';
import './main.js'; // to get Toast, etc.

let currentUserProfile = null;
let currentPages = [];
let editingPageId = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAccess();
    setupNavigation();
    setupEditor();
    
    // Load initial data
    loadDashboardStats();
    loadContentPages();
    
    // Setup Logout
    document.getElementById('td-logout-btn').addEventListener('click', async () => {
        try {
            await authService.logout();
            window.location.href = 'index.html';
        } catch (err) {
            console.error(err);
            window.Toast?.error("حدث خطأ أثناء تسجيل الخروج");
        }
    });
});

async function checkAccess() {
    const { session } = await authService.getSessionAsync();
    if (!session) {
        window.location.replace('login.html');
        return;
    }

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (error || !profile || profile.role !== 'teacher') {
        // Not a teacher, redirect to student dashboard
        window.location.replace('dashboard.html');
        return;
    }

    currentUserProfile = profile;
    document.getElementById('prof-name').textContent = profile.full_name;
    document.getElementById('prof-name-input').value = profile.full_name;
    document.getElementById('prof-email-input').value = session.user.email;
}

// --- Navigation ---
function setupNavigation() {
    const navItems = document.querySelectorAll('.td-nav-item[data-target]');
    const sections = document.querySelectorAll('.td-section');
    const sidebar = document.getElementById('td-sidebar');
    const hamburger = document.getElementById('td-hamburger');
    const sidebarClose = document.getElementById('td-sidebar-close');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            const target = item.getAttribute('data-target');
            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(`section-${target}`).classList.add('active');

            if (window.innerWidth <= 992) {
                sidebar.classList.remove('open');
            }
        });
    });

    hamburger.addEventListener('click', () => {
        sidebar.classList.add('open');
    });
    
    if (sidebarClose) {
        sidebarClose.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }
}

// --- Dashboard Home ---
async function loadDashboardStats() {
    try {
        const { data: pages, error } = await supabase
            .from('content_pages')
            .select('status');
            
        if (error) throw error;
        
        const publishedCount = pages.filter(p => p.status === 'published').length;
        const draftCount = pages.filter(p => p.status === 'draft').length;
        
        document.getElementById('stat-published').textContent = publishedCount;
        document.getElementById('stat-drafts').textContent = draftCount;
        
    } catch(err) {
        console.error("Error loading stats:", err);
    }
}

// --- Content Management ---
async function loadContentPages() {
    try {
        const { data: pages, error } = await supabase
            .from('content_pages')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        currentPages = pages;
        renderPagesTable();
        
    } catch (err) {
        console.error("Error loading pages:", err);
        window.Toast?.error("لم نتمكن من تحميل الصفحات");
    }
}

function renderPagesTable() {
    const tbody = document.getElementById('content-table-body');
    const searchTerm = document.getElementById('content-search').value.toLowerCase();
    const filterStatus = document.getElementById('content-filter').value;
    
    tbody.innerHTML = '';
    
    const filteredPages = currentPages.filter(page => {
        const matchesSearch = page.title.toLowerCase().includes(searchTerm);
        const matchesStatus = filterStatus === 'all' || page.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    if (filteredPages.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--color-text-muted);">لا توجد صفحات مطابقة</td></tr>';
        return;
    }

    filteredPages.forEach(page => {
        const tr = document.createElement('tr');
        
        const statusBadge = page.status === 'published' 
            ? '<span class="badge badge-published">منشور</span>'
            : '<span class="badge badge-draft">مسودة</span>';
            
        const date = new Date(page.updated_at).toLocaleDateString('ar-EG');
        
        tr.innerHTML = `
            <td><strong>${page.title}</strong><br><small style="color:var(--color-text-muted)">/${page.slug}</small></td>
            <td>${statusBadge}</td>
            <td>${date}</td>
            <td>
                <button class="btn-icon btn-edit" data-id="${page.id}" title="تعديل">✏️</button>
                <button class="btn-icon btn-delete" data-id="${page.id}" title="حذف" style="color: #ef4444;">🗑️</button>
                <a href="page.html?slug=${page.slug}" target="_blank" class="btn-icon btn-view" title="معاينة">👁️</a>
            </td>
        `;
        
        tbody.appendChild(tr);
    });

    // Attach events
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => openEditor(e.target.closest('button').dataset.id));
    });
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => confirmDelete(e.target.closest('button').dataset.id));
    });
}

document.getElementById('content-search').addEventListener('input', renderPagesTable);
document.getElementById('content-filter').addEventListener('change', renderPagesTable);

document.getElementById('btn-add-page').addEventListener('click', () => {
    openEditor(null);
});

document.getElementById('btn-back-list').addEventListener('click', () => {
    document.getElementById('content-editor-view').style.display = 'none';
    document.getElementById('content-list-view').style.display = 'block';
});

// --- Editor ---
function setupEditor() {
    // WYSIWYG commands
    document.querySelectorAll('.wysiwyg-btn[data-command]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const command = btn.getAttribute('data-command');
            document.execCommand(command, false, null);
        });
    });

    document.getElementById('btn-insert-link').addEventListener('click', (e) => {
        e.preventDefault();
        const url = prompt('أدخل الرابط:');
        if (url) document.execCommand('createLink', false, url);
    });

    document.getElementById('btn-insert-image').addEventListener('click', (e) => {
        e.preventDefault();
        const url = prompt('أدخل رابط الصورة:');
        if (url) document.execCommand('insertImage', false, url);
    });

    // Image Upload (Cover)
    const coverUploadArea = document.getElementById('cover-upload-area');
    const coverInput = document.getElementById('cover-input');
    
    coverUploadArea.addEventListener('click', () => {
        coverInput.click();
    });
    
    coverInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Show loading state
        document.getElementById('cover-upload-text').textContent = "جاري الرفع...";
        
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
            const filePath = `covers/${fileName}`;
            
            const { error: uploadError } = await supabase.storage
                .from('public_assets')
                .upload(filePath, file);
                
            if (uploadError) throw uploadError;
            
            const { data } = supabase.storage
                .from('public_assets')
                .getPublicUrl(filePath);
                
            setCoverImage(data.publicUrl);
            window.Toast?.success("تم رفع الصورة بنجاح");
            
        } catch (err) {
            console.error("Upload Error:", err);
            window.Toast?.error("حدث خطأ أثناء رفع الصورة");
            document.getElementById('cover-upload-text').textContent = "اضغط لرفع صورة";
        }
    });

    document.getElementById('btn-remove-cover').addEventListener('click', () => {
        setCoverImage(null);
        coverInput.value = '';
    });

    // Save Page
    document.getElementById('btn-save-page').addEventListener('click', savePage);
}

function setCoverImage(url) {
    const preview = document.getElementById('cover-preview');
    const text = document.getElementById('cover-upload-text');
    const removeBtn = document.getElementById('btn-remove-cover');
    
    if (url) {
        preview.src = url;
        preview.style.display = 'block';
        text.style.display = 'none';
        removeBtn.style.display = 'block';
        preview.dataset.url = url;
    } else {
        preview.src = '';
        preview.style.display = 'none';
        text.style.display = 'block';
        text.textContent = "اضغط لرفع صورة";
        removeBtn.style.display = 'none';
        preview.dataset.url = '';
    }
}

function openEditor(pageId) {
    editingPageId = pageId;
    
    const titleInput = document.getElementById('page-title');
    const slugInput = document.getElementById('page-slug');
    const summaryInput = document.getElementById('page-summary');
    const contentInput = document.getElementById('page-content');
    const statusSelect = document.getElementById('page-status');
    const editorTitle = document.getElementById('editor-title');
    
    if (pageId) {
        const page = currentPages.find(p => p.id === pageId);
        if (page) {
            editorTitle.textContent = "تعديل صفحة";
            titleInput.value = page.title || '';
            slugInput.value = page.slug || '';
            summaryInput.value = page.content ? extractSummary(page.content) : ''; // Or if summary was a field, wait, the schema doesn't have summary, we will derive it or ignore it. 
            // Wait, I see "وصف مختصر" in HTML but schema only has title, content, cover_image, slug.
            // Let's store summary as part of content or ignore it for now. I'll just clear it since we don't have a db field for it.
            
            contentInput.innerHTML = page.content || '';
            statusSelect.value = page.status || 'draft';
            setCoverImage(page.cover_image);
        }
    } else {
        editorTitle.textContent = "إضافة صفحة جديدة";
        titleInput.value = '';
        slugInput.value = '';
        summaryInput.value = '';
        contentInput.innerHTML = '';
        statusSelect.value = 'draft';
        setCoverImage(null);
    }
    
    document.getElementById('content-list-view').style.display = 'none';
    document.getElementById('content-editor-view').style.display = 'block';
}

function extractSummary(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent.substring(0, 100) + '...';
}

async function savePage() {
    const title = document.getElementById('page-title').value.trim();
    const slug = document.getElementById('page-slug').value.trim();
    const content = document.getElementById('page-content').innerHTML;
    const status = document.getElementById('page-status').value;
    const cover_image = document.getElementById('cover-preview').dataset.url || null;
    
    if (!title || !slug) {
        window.Toast?.error("يرجى إدخال العنوان والرابط");
        return;
    }
    
    const btn = document.getElementById('btn-save-page');
    btn.disabled = true;
    btn.textContent = "جاري الحفظ...";
    
    try {
        const pageData = {
            title,
            slug,
            content,
            status,
            cover_image,
            author_id: currentUserProfile.id
        };
        
        let error;
        
        if (editingPageId) {
            const res = await supabase.from('content_pages').update(pageData).eq('id', editingPageId);
            error = res.error;
        } else {
            const res = await supabase.from('content_pages').insert([pageData]);
            error = res.error;
        }
        
        if (error) {
            if (error.code === '23505') {
                throw new Error('الرابط (slug) مستخدم مسبقاً، يرجى اختيار رابط آخر.');
            }
            throw error;
        }
        
        window.Toast?.success("تم حفظ الصفحة بنجاح");
        await loadContentPages();
        await loadDashboardStats();
        
        document.getElementById('btn-back-list').click();
        
    } catch (err) {
        console.error("Save Error:", err);
        window.Toast?.error(err.message || "حدث خطأ أثناء الحفظ");
    } finally {
        btn.disabled = false;
        btn.textContent = "حفظ";
    }
}

// --- Delete Confirmation Modal ---
let deleteTargetId = null;

function confirmDelete(id) {
    deleteTargetId = id;
    document.getElementById('confirm-modal').style.display = 'flex';
}

document.getElementById('btn-confirm-no').addEventListener('click', () => {
    document.getElementById('confirm-modal').style.display = 'none';
    deleteTargetId = null;
});

document.getElementById('btn-confirm-yes').addEventListener('click', async () => {
    if (!deleteTargetId) return;
    
    document.getElementById('btn-confirm-yes').disabled = true;
    
    try {
        const { error } = await supabase.from('content_pages').delete().eq('id', deleteTargetId);
        if (error) throw error;
        
        window.Toast?.success("تم الحذف بنجاح");
        await loadContentPages();
        await loadDashboardStats();
        
    } catch (err) {
        console.error("Delete Error:", err);
        window.Toast?.error("حدث خطأ أثناء الحذف");
    } finally {
        document.getElementById('confirm-modal').style.display = 'none';
        document.getElementById('btn-confirm-yes').disabled = false;
        deleteTargetId = null;
    }
});
