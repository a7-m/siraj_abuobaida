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
let deleteTargetType = 'page'; // 'page' | 'comp' | 'question'

function confirmDelete(id, type = 'page') {
    deleteTargetId = id;
    deleteTargetType = type;
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
        if (deleteTargetType === 'comp') {
            const { error } = await supabase.from('competitions').delete().eq('id', deleteTargetId);
            if (error) throw error;
            window.Toast?.success("تم حذف المسابقة بنجاح");
            await loadCompetitions();
        } else if (deleteTargetType === 'question') {
            // Remove from competition_questions first (cascade), then questions table
            await supabase.from('competition_questions').delete().eq('question_id', deleteTargetId);
            const { error } = await supabase.from('questions').delete().eq('id', deleteTargetId);
            if (error) throw error;
            window.Toast?.success("تم حذف السؤال بنجاح");
            await loadCompQuestions(editingCompId);
        } else {
            const { error } = await supabase.from('content_pages').delete().eq('id', deleteTargetId);
            if (error) throw error;
            window.Toast?.success("تم الحذف بنجاح");
            await loadContentPages();
            await loadDashboardStats();
        }
    } catch (err) {
        console.error("Delete Error:", err);
        window.Toast?.error("حدث خطأ أثناء الحذف");
    } finally {
        document.getElementById('confirm-modal').style.display = 'none';
        document.getElementById('btn-confirm-yes').disabled = false;
        deleteTargetId = null;
    }
});

// =============================================================
// COMPETITIONS MANAGEMENT
// =============================================================

let currentComps = [];
let editingCompId = null;
let editingQuestionId = null;

// --- Setup ---
document.getElementById('btn-add-comp')?.addEventListener('click', () => openCompEditor(null));
document.getElementById('btn-comp-back-list')?.addEventListener('click', () => {
    document.getElementById('comp-editor-view').style.display = 'none';
    document.getElementById('comp-list-view').style.display = 'block';
    editingCompId = null;
});
document.getElementById('btn-save-comp')?.addEventListener('click', saveComp);

// Cover image upload for competitions
const compCoverArea = document.getElementById('comp-cover-upload-area');
const compCoverInput = document.getElementById('comp-cover-input');
compCoverArea?.addEventListener('click', () => compCoverInput.click());
compCoverInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    document.getElementById('comp-cover-upload-text').textContent = 'جاري الرفع...';
    try {
        const ext = file.name.split('.').pop();
        const path = `competitions/${Math.random().toString(36).substring(2)}.${ext}`;
        const { error: ue } = await supabase.storage.from('public_assets').upload(path, file);
        if (ue) throw ue;
        const { data } = supabase.storage.from('public_assets').getPublicUrl(path);
        setCompCover(data.publicUrl);
        window.Toast?.success('تم رفع الصورة بنجاح');
    } catch (err) {
        console.error(err);
        window.Toast?.error('حدث خطأ أثناء رفع الصورة');
        document.getElementById('comp-cover-upload-text').textContent = 'اضغط لرفع صورة';
    }
});
document.getElementById('btn-remove-comp-cover')?.addEventListener('click', () => {
    setCompCover(null);
    compCoverInput.value = '';
});

function setCompCover(url) {
    const preview = document.getElementById('comp-cover-preview');
    const text = document.getElementById('comp-cover-upload-text');
    const removeBtn = document.getElementById('btn-remove-comp-cover');
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
        text.textContent = 'اضغط لرفع صورة';
        removeBtn.style.display = 'none';
        preview.dataset.url = '';
    }
}

// --- Load & Render ---
async function loadCompetitions() {
    try {
        const { data, error } = await supabase
            .from('competitions')
            .select('id, title, status, duration_seconds, start_date, created_at')
            .order('created_at', { ascending: false });
        if (error) throw error;
        currentComps = data || [];
        renderCompetitionsTable();
    } catch (err) {
        console.error('loadCompetitions:', err);
        window.Toast?.error('تعذّر تحميل المسابقات');
    }
}

function renderCompetitionsTable() {
    const tbody = document.getElementById('comp-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (currentComps.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--color-text-muted);">لا توجد مسابقات بعد</td></tr>';
        return;
    }

    const statusLabels = { draft: 'مسودة', active: 'نشطة', ended: 'منتهية', archived: 'مؤرشفة' };
    const statusColors = { draft: '#6b7280', active: '#22c55e', ended: '#ef4444', archived: '#9ca3af' };

    currentComps.forEach(comp => {
        const tr = document.createElement('tr');
        const statusLabel = statusLabels[comp.status] || comp.status;
        const statusColor = statusColors[comp.status] || '#6b7280';
        const duration = comp.duration_seconds ? `${Math.ceil(comp.duration_seconds / 60)} د` : '—';
        const startDate = comp.start_date ? new Date(comp.start_date).toLocaleDateString('ar-EG') : '—';

        tr.innerHTML = `
            <td><strong>${comp.title}</strong></td>
            <td><span class="badge" style="background:${statusColor}20; color:${statusColor}; border:1px solid ${statusColor}40;">${statusLabel}</span></td>
            <td>${duration}</td>
            <td>${startDate}</td>
            <td>
                <button class="btn-icon comp-btn-edit" data-id="${comp.id}" title="تعديل">✏️</button>
                <button class="btn-icon comp-btn-delete" data-id="${comp.id}" title="حذف" style="color:#ef4444;">🗑️</button>
            </td>`;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.comp-btn-edit').forEach(btn => {
        btn.addEventListener('click', () => openCompEditor(btn.dataset.id));
    });
    document.querySelectorAll('.comp-btn-delete').forEach(btn => {
        btn.addEventListener('click', () => confirmDelete(btn.dataset.id, 'comp'));
    });
}

function openCompEditor(compId) {
    editingCompId = compId;
    const comp = compId ? currentComps.find(c => c.id === compId) : null;

    document.getElementById('comp-editor-title').textContent = comp ? 'تعديل المسابقة' : 'مسابقة جديدة';
    document.getElementById('comp-title').value = comp?.title || '';
    document.getElementById('comp-description').value = comp?.description || '';
    document.getElementById('comp-final-note').value = comp?.final_note || '';
    document.getElementById('comp-status').value = comp?.status || 'active';
    document.getElementById('comp-duration').value = comp?.duration_seconds ? Math.ceil(comp.duration_seconds / 60) : '';
    document.getElementById('comp-max-attempts').value = comp?.max_attempts || '';
    document.getElementById('comp-result-visibility').checked = comp ? (comp.result_visibility !== false) : true;
    document.getElementById('comp-shuffle').checked = comp?.shuffle_questions || false;

    // Dates — convert ISO to datetime-local
    const toLocal = (iso) => iso ? iso.slice(0, 16) : '';
    document.getElementById('comp-start-date').value = toLocal(comp?.start_date);
    document.getElementById('comp-end-date').value = toLocal(comp?.end_date);

    setCompCover(comp?.image_url || null);

    // Show/hide questions panel
    const qPanel = document.getElementById('comp-questions-panel');
    if (compId) {
        qPanel.style.display = 'block';
        loadCompQuestions(compId);
    } else {
        qPanel.style.display = 'none';
    }

    document.getElementById('comp-list-view').style.display = 'none';
    document.getElementById('comp-editor-view').style.display = 'block';
}

async function saveComp() {
    const title = document.getElementById('comp-title').value.trim();
    if (!title) { window.Toast?.error('يرجى إدخال اسم المسابقة'); return; }

    const durationMins = parseInt(document.getElementById('comp-duration').value) || null;
    const maxAttempts = parseInt(document.getElementById('comp-max-attempts').value) || null;
    const startVal = document.getElementById('comp-start-date').value;
    const endVal = document.getElementById('comp-end-date').value;

    const payload = {
        title,
        description: document.getElementById('comp-description').value.trim() || null,
        final_note: document.getElementById('comp-final-note').value.trim() || null,
        status: document.getElementById('comp-status').value,
        duration_seconds: durationMins ? durationMins * 60 : null,
        max_attempts: maxAttempts,
        result_visibility: document.getElementById('comp-result-visibility').checked,
        shuffle_questions: document.getElementById('comp-shuffle').checked,
        start_date: startVal ? new Date(startVal).toISOString() : null,
        end_date: endVal ? new Date(endVal).toISOString() : null,
        image_url: document.getElementById('comp-cover-preview').dataset.url || null,
    };

    const btn = document.getElementById('btn-save-comp');
    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';

    try {
        let savedId = editingCompId;
        if (editingCompId) {
            const { error } = await supabase.from('competitions').update(payload).eq('id', editingCompId);
            if (error) throw error;
        } else {
            const { data, error } = await supabase.from('competitions').insert([payload]).select('id').single();
            if (error) throw error;
            savedId = data.id;
            editingCompId = savedId;
        }

        window.Toast?.success('تم حفظ المسابقة بنجاح');
        await loadCompetitions();

        // Show questions panel after save
        document.getElementById('comp-questions-panel').style.display = 'block';
        await loadCompQuestions(savedId);
        document.getElementById('comp-editor-title').textContent = 'تعديل المسابقة';

    } catch (err) {
        console.error('saveComp:', err);
        window.Toast?.error(err.message || 'حدث خطأ أثناء الحفظ');
    } finally {
        btn.disabled = false;
        btn.textContent = 'حفظ المسابقة';
    }
}

// =============================================================
// QUESTIONS MANAGEMENT
// =============================================================

let currentQuestions = [];

document.getElementById('btn-add-question')?.addEventListener('click', () => openQuestionEditor(null));
document.getElementById('btn-cancel-question')?.addEventListener('click', () => {
    document.getElementById('question-editor').style.display = 'none';
    editingQuestionId = null;
});
document.getElementById('btn-save-question')?.addEventListener('click', saveQuestion);
document.getElementById('q-type')?.addEventListener('change', () => renderQuestionOptions(null));

async function loadCompQuestions(compId) {
    if (!compId) return;
    try {
        const { data, error } = await supabase
            .from('competition_questions')
            .select('order_num, questions(id, type, text, points, metadata)')
            .eq('competition_id', compId)
            .order('order_num', { ascending: true });
        if (error) throw error;
        currentQuestions = (data || []).map(r => r.questions).filter(Boolean);
        renderQuestionsPanel();
    } catch (err) {
        console.error('loadCompQuestions:', err);
    }
}

function renderQuestionsPanel() {
    const container = document.getElementById('comp-questions-list');
    if (!container) return;

    if (currentQuestions.length === 0) {
        container.innerHTML = '<p style="color:var(--color-text-muted); font-size:0.9rem;">لا توجد أسئلة بعد. اضغط "+ إضافة سؤال".</p>';
        return;
    }

    const typeLabels = { mcq: 'اختيار متعدد', tf: 'صح/خطأ', order: 'ترتيب' };

    container.innerHTML = currentQuestions.map((q, i) => `
        <div class="card" style="padding:1rem; margin-bottom:0.75rem; display:flex; justify-content:space-between; align-items:center; gap:1rem;">
            <div>
                <span style="color:var(--color-text-muted); font-size:0.8rem; margin-left:0.5rem;">${i + 1}. [${typeLabels[q.type] || q.type}] ${q.points} نقطة</span>
                <div style="font-weight:500;">${q.text}</div>
            </div>
            <div style="display:flex; gap:0.5rem; flex-shrink:0;">
                <button class="btn-icon q-btn-edit" data-id="${q.id}" title="تعديل">✏️</button>
                <button class="btn-icon q-btn-delete" data-id="${q.id}" title="حذف" style="color:#ef4444;">🗑️</button>
            </div>
        </div>`).join('');

    container.querySelectorAll('.q-btn-edit').forEach(btn => {
        btn.addEventListener('click', () => openQuestionEditor(btn.dataset.id));
    });
    container.querySelectorAll('.q-btn-delete').forEach(btn => {
        btn.addEventListener('click', () => confirmDelete(btn.dataset.id, 'question'));
    });
}

function openQuestionEditor(questionId) {
    editingQuestionId = questionId;
    const q = questionId ? currentQuestions.find(x => x.id === questionId) : null;

    document.getElementById('q-editor-title').textContent = q ? 'تعديل السؤال' : 'سؤال جديد';
    document.getElementById('q-type').value = q?.type || 'mcq';
    document.getElementById('q-points').value = q?.points || 1;
    document.getElementById('q-text').value = q?.text || '';

    renderQuestionOptions(q);
    document.getElementById('question-editor').style.display = 'block';
    document.getElementById('question-editor').scrollIntoView({ behavior: 'smooth' });
}

function renderQuestionOptions(q) {
    const type = document.getElementById('q-type').value;
    const area = document.getElementById('q-options-area');
    const meta = q?.metadata || {};

    if (type === 'mcq') {
        const opts = meta.options || ['', '', '', ''];
        const correct = meta.correct_answer || '';
        area.innerHTML = `
            <div class="form-group">
                <label class="form-label">الخيارات (خيار واحد في كل حقل)</label>
                ${opts.map((o, i) => `
                    <input type="text" class="form-control q-opt-input" style="margin-bottom:0.5rem;"
                           placeholder="الخيار ${i + 1}" value="${o}" data-idx="${i}">`).join('')}
                <button type="button" id="btn-add-opt" class="btn btn-outline" style="margin-top:0.25rem; font-size:0.85rem;">+ إضافة خيار</button>
            </div>
            <div class="form-group">
                <label class="form-label">الإجابة الصحيحة (اكتب نص الإجابة كما هو)</label>
                <input type="text" id="q-correct" class="form-control" value="${correct}" placeholder="انسخ نص الإجابة الصحيحة">
            </div>`;
        document.getElementById('btn-add-opt')?.addEventListener('click', () => {
            const newInput = document.createElement('input');
            newInput.type = 'text';
            newInput.className = 'form-control q-opt-input';
            newInput.style.marginBottom = '0.5rem';
            newInput.placeholder = 'خيار جديد';
            document.getElementById('btn-add-opt').before(newInput);
        });

    } else if (type === 'tf') {
        const correct = meta.correct_answer || 'صح';
        area.innerHTML = `
            <div class="form-group">
                <label class="form-label">الإجابة الصحيحة</label>
                <select id="q-correct" class="form-control">
                    <option value="صح" ${correct === 'صح' ? 'selected' : ''}>صح</option>
                    <option value="خطأ" ${correct === 'خطأ' ? 'selected' : ''}>خطأ</option>
                </select>
            </div>`;

    } else if (type === 'order') {
        const items = meta.items || ['', '', ''];
        const correctOrder = meta.correct_order || items;
        const instruction = meta.instruction || 'رتّب العناصر بالترتيب الصحيح';
        area.innerHTML = `
            <div class="form-group">
                <label class="form-label">تعليمات الترتيب</label>
                <input type="text" id="q-order-instruction" class="form-control" value="${instruction}">
            </div>
            <div class="form-group">
                <label class="form-label">العناصر (بالترتيب الصحيح — الأول هو الأول)</label>
                <div id="q-order-items">
                    ${correctOrder.map((item, i) => `
                        <input type="text" class="form-control q-order-item" style="margin-bottom:0.5rem;"
                               placeholder="العنصر ${i + 1}" value="${item}">`).join('')}
                </div>
                <button type="button" id="btn-add-order-item" class="btn btn-outline" style="margin-top:0.25rem; font-size:0.85rem;">+ إضافة عنصر</button>
            </div>`;
        document.getElementById('btn-add-order-item')?.addEventListener('click', () => {
            const inp = document.createElement('input');
            inp.type = 'text';
            inp.className = 'form-control q-order-item';
            inp.style.marginBottom = '0.5rem';
            inp.placeholder = 'عنصر جديد';
            document.getElementById('btn-add-order-item').before(inp);
        });
    } else {
        area.innerHTML = '';
    }
}

function buildMetadata(type) {
    if (type === 'mcq') {
        const opts = Array.from(document.querySelectorAll('.q-opt-input')).map(i => i.value.trim()).filter(Boolean);
        const correct = document.getElementById('q-correct')?.value.trim() || '';
        return { options: opts, correct_answer: correct };
    }
    if (type === 'tf') {
        const correct = document.getElementById('q-correct')?.value || 'صح';
        return { options: ['صح', 'خطأ'], correct_answer: correct };
    }
    if (type === 'order') {
        const instruction = document.getElementById('q-order-instruction')?.value.trim() || 'رتّب العناصر بالترتيب الصحيح';
        const items = Array.from(document.querySelectorAll('.q-order-item')).map(i => i.value.trim()).filter(Boolean);
        return { instruction, items, correct_order: items };
    }
    return {};
}

async function saveQuestion() {
    const type = document.getElementById('q-type').value;
    const text = document.getElementById('q-text').value.trim();
    const points = parseInt(document.getElementById('q-points').value) || 1;

    if (!text) { window.Toast?.error('يرجى إدخال نص السؤال'); return; }
    if (!editingCompId) { window.Toast?.error('يرجى حفظ المسابقة أولاً'); return; }

    const metadata = buildMetadata(type);
    const btn = document.getElementById('btn-save-question');
    btn.disabled = true;
    btn.textContent = 'جاري الحفظ...';

    try {
        let qId = editingQuestionId;

        if (editingQuestionId) {
            const { error } = await supabase.from('questions')
                .update({ type, question_type: type, text, points, metadata })
                .eq('id', editingQuestionId);
            if (error) throw error;
        } else {
            const { data, error } = await supabase.from('questions')
                .insert([{ type, question_type: type, text, points, metadata }])
                .select('id').single();
            if (error) throw error;
            qId = data.id;

            // Link to competition
            const nextOrder = currentQuestions.length;
            const { error: linkErr } = await supabase.from('competition_questions')
                .insert([{ competition_id: editingCompId, question_id: qId, order_num: nextOrder }]);
            if (linkErr) throw linkErr;
        }

        window.Toast?.success('تم حفظ السؤال بنجاح');
        document.getElementById('question-editor').style.display = 'none';
        editingQuestionId = null;
        await loadCompQuestions(editingCompId);

    } catch (err) {
        console.error('saveQuestion:', err);
        window.Toast?.error(err.message || 'حدث خطأ أثناء حفظ السؤال');
    } finally {
        btn.disabled = false;
        btn.textContent = 'حفظ السؤال';
    }
}

// Hook into navigation to load competitions when section becomes active
document.addEventListener('DOMContentLoaded', () => {
    const compNavItem = document.querySelector('.td-nav-item[data-target="competitions"]');
    compNavItem?.addEventListener('click', () => {
        loadCompetitions();
    });
});
