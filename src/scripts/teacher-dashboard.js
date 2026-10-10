import { authService } from '../services/auth.js';
import { supabase } from '../services/supabase.js';
import { setupCompetitions } from './teacher-competitions.js';
import { setupChallenges } from './teacher-challenges.js';
import { setupSections } from './teacher-sections.js';
import './main.js'; // to get Toast, etc.

let currentUserProfile = null;
let currentPages = [];
let editingPageId = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await checkAccess();
    setupNavigation();
    setupEditor();
    setupCompetitions();
    setupChallenges();
    setupSections();
    setupParticipants();
    
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

        // Total registered students
        const { count: studentsCount, error: sErr } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'student');
        if (!sErr && studentsCount !== null) {
            const el = document.getElementById('stat-students-count');
            if (el) el.textContent = studentsCount;
        }
        
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
        } else if (deleteTargetType === 'participant') {
            // Delete all activity records for this student/guest key
            const student = getStudentByKey(deleteTargetId);
            if (student && student.activities.length > 0) {
                const ids = student.activities.map(a => a.id);
                // Try to delete from all possible tables based on activity type
                for (const act of student.activities) {
                    if (act.activity_type === 'reading') {
                        await supabase.from('reading_participations').delete().eq('id', act.id);
                    } else if (act.activity_type === 'competition') {
                        await supabase.from('competition_attempts').delete().eq('id', act.id);
                    } else if (act.activity_type === 'research') {
                        await supabase.from('research_submissions').delete().eq('id', act.id);
                    }
                }
                // Remove from local cache
                allParticipantsData = allParticipantsData.filter(p => !ids.includes(p.id));
                applyParticipantsFilters();
            }
            window.Toast?.success("تم حذف بيانات المشارك بنجاح");
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

// =============================================================
// PARTICIPANTS SYSTEM (المشاركون)
// =============================================================

let allParticipantsData = [];
let filteredParticipants = [];
let currentPartPage = 1;
let partPageSize = 25;
let isLoadingParticipants = false;

function setupParticipants() {
    // Navigation hook
    const partNavItem = document.querySelector('.td-nav-item[data-target="participants"]');
    partNavItem?.addEventListener('click', () => {
        loadParticipantsData();
    });

    // Refresh & Export
    document.getElementById('btn-refresh-participants')?.addEventListener('click', () => {
        loadParticipantsData();
    });

    document.getElementById('btn-export-participants')?.addEventListener('click', () => {
        exportParticipantsToCSV();
    });

    // Filters
    const filterInputs = [
        'part-filter-name',
        'part-filter-email',
        'part-filter-section',
        'part-filter-date-from',
        'part-filter-date-to'
    ];
    filterInputs.forEach(id => {
        const el = document.getElementById(id);
        el?.addEventListener('input', () => {
            applyParticipantsFilters();
        });
    });

    const filterSelects = [
        'part-filter-activity',
        'part-filter-user-type',
        'part-filter-grade',
        'part-filter-school',
        'part-filter-status',
        'part-filter-sort'
    ];
    filterSelects.forEach(id => {
        const el = document.getElementById(id);
        el?.addEventListener('change', () => {
            applyParticipantsFilters();
        });
    });

    // Reset Filters
    document.getElementById('btn-reset-part-filters')?.addEventListener('click', () => {
        resetParticipantsFilters();
    });

    // Page size
    document.getElementById('part-page-size')?.addEventListener('change', (e) => {
        partPageSize = parseInt(e.target.value, 10) || 25;
        currentPartPage = 1;
        renderParticipantsTable();
    });

    // Modal Close
    const closeModal = () => {
        const modal = document.getElementById('part-detail-modal');
        if (modal) modal.style.display = 'none';
    };
    document.getElementById('btn-close-part-modal')?.addEventListener('click', closeModal);
    document.getElementById('btn-modal-close')?.addEventListener('click', closeModal);
    document.getElementById('part-detail-modal')?.addEventListener('click', (e) => {
        if (e.target.id === 'part-detail-modal') closeModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

async function loadParticipantsData() {
    if (isLoadingParticipants) return;
    isLoadingParticipants = true;

    const tbody = document.getElementById('participants-table-body');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: 3rem; color: var(--color-text-muted);">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 0.75rem;">
                        <div style="font-size: 2rem;">⏳</div>
                        <span>جاري تحميل بيانات المشاركين من قاعدة البيانات...</span>
                    </div>
                </td>
            </tr>
        `;
    }

    try {
        const { data, error } = await supabase
            .from('all_participants_view')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        allParticipantsData = data || [];
        updateParticipantsStatCards(allParticipantsData);
        applyParticipantsFilters();

    } catch (err) {
        console.error('loadParticipantsData error:', err);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align: center; padding: 2.5rem; color: #ef4444;">
                        <div style="display: flex; flex-direction: column; align-items: center; gap: 0.75rem;">
                            <span style="font-size: 2rem;">⚠️</span>
                            <strong>تعذر تحميل بيانات المشاركين</strong>
                            <p style="margin: 0; color: var(--color-text-muted); font-size: 0.85rem;">
                                ${escapeHtml(err.message || 'حدث خطأ في الاتصال بقاعدة البيانات')}
                            </p>
                            <button id="btn-retry-participants" class="btn btn-outline" style="margin-top: 0.5rem;">
                                إعادة المحاولة
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            document.getElementById('btn-retry-participants')?.addEventListener('click', () => {
                loadParticipantsData();
            });
        }
        window.Toast?.error('تعذر تحميل بيانات المشاركين');
    } finally {
        isLoadingParticipants = false;
    }
}

function updateParticipantsStatCards(data) {
    // Unique participants calculation:
    // Distinct students (by student_id) + distinct guests (by guest_session_id or name)
    const uniqueParticipants = new Set();
    const registeredStudents = new Set();
    const guestParticipants = new Set();

    let readingCount = 0;
    let competitionCount = 0;
    let researchCount = 0;

    data.forEach(p => {
        if (p.participant_type === 'registered' && p.student_id) {
            const id = 'reg_' + p.student_id;
            uniqueParticipants.add(id);
            registeredStudents.add(p.student_id);
        } else {
            const guestId = 'guest_' + (p.guest_session_id || p.full_name || 'unknown');
            uniqueParticipants.add(guestId);
            guestParticipants.add(guestId);
        }

        if (p.activity_type === 'reading') readingCount++;
        else if (p.activity_type === 'competition') competitionCount++;
        else if (p.activity_type === 'research') researchCount++;
    });

    const setEl = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setEl('stat-part-total', uniqueParticipants.size);
    setEl('stat-part-registered', registeredStudents.size);
    setEl('stat-part-guests', guestParticipants.size);
    setEl('stat-part-reading', readingCount);
    setEl('stat-part-competitions', competitionCount);
    setEl('stat-part-research', researchCount);
}

function applyParticipantsFilters() {
    const nameQuery = (document.getElementById('part-filter-name')?.value || '').trim().toLowerCase();
    const emailQuery = (document.getElementById('part-filter-email')?.value || '').trim().toLowerCase();
    const activityFilter = document.getElementById('part-filter-activity')?.value || 'all';
    const userTypeFilter = document.getElementById('part-filter-user-type')?.value || 'all';
    const gradeFilter = document.getElementById('part-filter-grade')?.value || 'all';
    const schoolFilter = document.getElementById('part-filter-school')?.value || 'all';
    const sectionQuery = (document.getElementById('part-filter-section')?.value || '').trim();
    const statusFilter = document.getElementById('part-filter-status')?.value || 'all';
    const dateFromVal = document.getElementById('part-filter-date-from')?.value;
    const dateToVal = document.getElementById('part-filter-date-to')?.value;
    const sortVal = document.getElementById('part-filter-sort')?.value || 'date-desc';

    filteredParticipants = allParticipantsData.filter(p => {
        // Name
        if (nameQuery && !(p.full_name || '').toLowerCase().includes(nameQuery)) {
            return false;
        }

        // Email
        if (emailQuery && !(p.email || '').toLowerCase().includes(emailQuery)) {
            return false;
        }

        // Activity type
        if (activityFilter !== 'all' && p.activity_type !== activityFilter) {
            return false;
        }

        // User type
        if (userTypeFilter !== 'all' && p.participant_type !== userTypeFilter) {
            return false;
        }

        // School
        if (schoolFilter === 'abu_obaida') {
            if (p.school_type && p.school_type !== 'abu_obaida') return false;
        } else if (schoolFilter === 'other') {
            if (p.school_type !== 'other') return false;
        }

        // Grade
        if (gradeFilter !== 'all' && p.grade !== gradeFilter) {
            return false;
        }

        // Section
        if (sectionQuery && !(p.section || '').includes(sectionQuery)) {
            return false;
        }

        // Status
        if (statusFilter !== 'all') {
            if (p.status !== statusFilter) return false;
        }

        // Date range
        if (dateFromVal) {
            const pDate = new Date(p.created_at);
            const fromDate = new Date(dateFromVal);
            if (pDate < fromDate) return false;
        }
        if (dateToVal) {
            const pDate = new Date(p.created_at);
            const toDate = new Date(dateToVal);
            toDate.setHours(23, 59, 59, 999);
            if (pDate > toDate) return false;
        }

        return true;
    });

    // Sorting
    filteredParticipants.sort((a, b) => {
        switch (sortVal) {
            case 'date-asc':
                return new Date(a.created_at || 0) - new Date(b.created_at || 0);
            case 'name-asc':
                return (a.full_name || '').localeCompare(b.full_name || '', 'ar');
            case 'name-desc':
                return (b.full_name || '').localeCompare(a.full_name || '', 'ar');
            case 'score-desc':
                return (b.score ?? -999999) - (a.score ?? -999999);
            case 'score-asc':
                return (a.score ?? 999999) - (b.score ?? 999999);
            case 'date-desc':
            default:
                return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        }
    });

    // Update count display
    const countEl = document.getElementById('part-results-count');
    const grouped = groupParticipantsByStudent(filteredParticipants);
    if (countEl) {
        countEl.textContent = `عرض ${grouped.size} طالب فريد (${filteredParticipants.length} مشاركة) من إجمالي ${allParticipantsData.length} مشاركة`;
    }

    currentPartPage = 1;
    renderParticipantsTable();
}

function resetParticipantsFilters() {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };

    setVal('part-filter-name', '');
    setVal('part-filter-email', '');
    setVal('part-filter-section', '');
    setVal('part-filter-date-from', '');
    setVal('part-filter-date-to', '');
    setVal('part-filter-activity', 'all');
    setVal('part-filter-user-type', 'all');
    setVal('part-filter-grade', 'all');
    setVal('part-filter-school', 'all');
    setVal('part-filter-status', 'all');
    setVal('part-filter-sort', 'date-desc');

    applyParticipantsFilters();
}

function renderParticipantsTable() {
    const container = document.getElementById('participants-cards-grid');
    if (!container) return;

    if (filteredParticipants.length === 0) {
        container.innerHTML = `
            <div class="part-empty-state">
                <span style="font-size: 3rem;">🔍</span>
                <strong>لا توجد مشاركات مطابقة لمعايير البحث</strong>
                <p>جرّب تعديل كلمات البحث أو مسح الفلاتر المحددة.</p>
                <button id="btn-empty-reset-filters" class="btn btn-outline">إعادة ضبط الفلاتر</button>
            </div>
        `;
        container.querySelector('#btn-empty-reset-filters')?.addEventListener('click', resetParticipantsFilters);
        renderPaginationControls(0);
        return;
    }

    // Group by unique student (student_id for registered, guest_session_id or name for guests)
    const grouped = groupParticipantsByStudent(filteredParticipants);
    const groupedArr = Array.from(grouped.values());

    const totalPages = Math.ceil(groupedArr.length / partPageSize);
    if (currentPartPage > totalPages) currentPartPage = totalPages;
    if (currentPartPage < 1) currentPartPage = 1;

    const startIndex = (currentPartPage - 1) * partPageSize;
    const pageItems = groupedArr.slice(startIndex, startIndex + partPageSize);

    container.innerHTML = pageItems.map(student => buildStudentCard(student)).join('');

    // Attach events
    container.querySelectorAll('.btn-student-details').forEach(btn => {
        btn.addEventListener('click', () => openStudentDetailModal(btn.dataset.key));
    });
    container.querySelectorAll('.btn-student-delete').forEach(btn => {
        btn.addEventListener('click', () => confirmDeleteStudent(btn.dataset.key));
    });

    renderPaginationControls(totalPages);
}

function groupParticipantsByStudent(participants) {
    const map = new Map();
    participants.forEach(p => {
        const key = p.participant_type === 'registered' && p.student_id
            ? 'reg_' + p.student_id
            : 'guest_' + (p.guest_session_id || p.full_name || p.id);

        if (!map.has(key)) {
            map.set(key, {
                key,
                full_name: p.full_name,
                email: p.email,
                grade: p.grade,
                section: p.section,
                school_type: p.school_type,
                school_name: p.school_name,
                participant_type: p.participant_type,
                student_id: p.student_id,
                guest_session_id: p.guest_session_id,
                activities: []
            });
        }
        map.get(key).activities.push(p);
    });
    return map;
}

function getReadingLevel(activities) {
    const readingActivities = activities.filter(a => a.activity_type === 'reading');
    if (readingActivities.length === 0) return null;
    // Get the highest level number
    let maxLevel = 0;
    let levelTitle = '';
    readingActivities.forEach(a => {
        const d = a.details || {};
        const lvl = parseInt(d.level_number || 0);
        if (lvl > maxLevel) {
            maxLevel = lvl;
            levelTitle = d.level_title || '';
        }
        if (!maxLevel && a.score !== null && a.score !== undefined) {
            maxLevel = a.score;
        }
    });
    return maxLevel ? { level: maxLevel, title: levelTitle } : { level: readingActivities.length, title: 'مشارك' };
}

function buildStudentCard(student) {
    const { key, full_name, email, grade, section, school_type, school_name, participant_type, activities } = student;
    const isReg = participant_type === 'registered';

    const initials = (full_name || 'ز').split(' ').map(w => w[0]).slice(0, 2).join('');
    const classText = grade ? `${grade}${section ? ' / ' + section : ''}` : null;

    const isAbuObaida = !school_type || school_type === 'abu_obaida';
    const schoolBadge = isAbuObaida
        ? '<span class="badge" style="background:rgba(18,117,71,0.12); color:#127547; font-size:0.7rem; border:1px solid rgba(18,117,71,0.3);">🏫 أبو عبيدة</span>'
        : `<span class="badge" style="background:rgba(217,119,6,0.12); color:#d97706; font-size:0.7rem; border:1px solid rgba(217,119,6,0.3);">🏫 ${escapeHtml(school_name || 'مدرسة أخرى')}</span>`;

    // Activity badges
    const actTypes = [...new Set(activities.map(a => a.activity_type))];
    const actBadges = actTypes.map(type => {
        if (type === 'competition') return '<span class="badge badge-act-comp">🏆 مسابقة</span>';
        if (type === 'reading') return '<span class="badge badge-act-reading">📚 قراءة</span>';
        return '<span class="badge badge-act-research">🔬 بحث</span>';
    }).join('');

    // Reading level
    const reading = getReadingLevel(activities);
    const readingBadge = reading
        ? `<div class="part-card-reading"><span class="part-card-reading-label">مستوى القراءة:</span><span class="part-card-reading-val">المستوى ${reading.level}${reading.title ? ' — ' + reading.title : ''}</span></div>`
        : '';

    // Latest activity date
    const latestDate = activities.reduce((latest, a) => {
        const d = new Date(a.created_at || 0);
        return d > latest ? d : latest;
    }, new Date(0));

    return `
        <div class="part-student-card">
            <div class="part-card-header">
                <div class="part-card-avatar">${escapeHtml(initials)}</div>
                <div class="part-card-info">
                    <div class="part-card-name">${escapeHtml(full_name || 'مشارك زائر')}</div>
                    <div style="display:flex; gap:0.35rem; flex-wrap:wrap; margin:0.25rem 0;">
                        ${schoolBadge}
                        ${classText ? `<div class="part-card-class">📚 ${escapeHtml(classText)}</div>` : ''}
                    </div>
                    <div class="part-card-type">${isReg ? '<span class="badge badge-reg" style="font-size:0.7rem;">🎓 مسجل</span>' : '<span class="badge badge-guest" style="font-size:0.7rem;">🌐 زائر</span>'}</div>
                </div>
                <div class="part-card-actions">
                    <button class="btn-student-details btn btn-outline btn-sm" data-key="${escapeHtml(key)}" title="عرض التفاصيل">🔍 التفاصيل</button>
                    <button class="btn-student-delete btn-icon-danger" data-key="${escapeHtml(key)}" title="حذف المشارك">🗑️</button>
                </div>
            </div>

            ${readingBadge}

            <div class="part-card-body">
                ${email ? `<div class="part-card-meta"><span>📧</span><span style="font-size:0.8rem; word-break:break-all;">${escapeHtml(email)}</span></div>` : ''}
                <div class="part-card-meta"><span>📋</span><span style="font-size:0.82rem;">${activities.length} نشاط مسجل</span></div>
                <div class="part-card-meta"><span>📅</span><span style="font-size:0.8rem;">${formatArabicDate(latestDate.toISOString())}</span></div>
            </div>

            <div class="part-card-footer">
                ${actBadges}
            </div>
        </div>
    `;
}

function confirmDeleteStudent(key) {
    const student = getStudentByKey(key);
    if (!student) return;
    const name = student.full_name || 'هذا المشارك';
    document.getElementById('confirm-title').textContent = 'تأكيد حذف المشارك';
    document.getElementById('confirm-message').textContent = `هل أنت متأكد من حذف جميع بيانات مشاركات "${name}"؟ لا يمكن التراجع عن هذا الإجراء.`;
    deleteTargetId = key;
    deleteTargetType = 'participant';
    document.getElementById('confirm-modal').style.display = 'flex';
}

function getStudentByKey(key) {
    const grouped = groupParticipantsByStudent(allParticipantsData);
    return grouped.get(key) || null;
}

function renderPaginationControls(totalPages) {
    const pageInfo = document.getElementById('part-page-info');
    const container = document.getElementById('part-page-buttons');
    if (!container) return;

    if (totalPages <= 1) {
        if (pageInfo) pageInfo.textContent = `الصفحة 1 من 1`;
        container.innerHTML = '';
        return;
    }

    if (pageInfo) {
        pageInfo.textContent = `الصفحة ${currentPartPage} من ${totalPages}`;
    }

    let buttonsHtml = '';

    // Prev
    buttonsHtml += `
        <button class="btn-page" ${currentPartPage <= 1 ? 'disabled' : ''} id="btn-part-prev">
            السابق
        </button>
    `;

    // Numeric pages
    const maxVisible = 5;
    let startPage = Math.max(1, currentPartPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(1, endPage - maxVisible + 1);
    }

    if (startPage > 1) {
        buttonsHtml += `<button class="btn-page" data-page="1">1</button>`;
        if (startPage > 2) buttonsHtml += `<span style="padding: 0 0.25rem;">...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        buttonsHtml += `
            <button class="btn-page ${i === currentPartPage ? 'active' : ''}" data-page="${i}">
                ${i}
            </button>
        `;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) buttonsHtml += `<span style="padding: 0 0.25rem;">...</span>`;
        buttonsHtml += `<button class="btn-page" data-page="${totalPages}">${totalPages}</button>`;
    }

    // Next
    buttonsHtml += `
        <button class="btn-page" ${currentPartPage >= totalPages ? 'disabled' : ''} id="btn-part-next">
            التالي
        </button>
    `;

    container.innerHTML = buttonsHtml;

    container.querySelector('#btn-part-prev')?.addEventListener('click', () => {
        if (currentPartPage > 1) {
            currentPartPage--;
            renderParticipantsTable();
        }
    });

    container.querySelector('#btn-part-next')?.addEventListener('click', () => {
        if (currentPartPage < totalPages) {
            currentPartPage++;
            renderParticipantsTable();
        }
    });

    container.querySelectorAll('.btn-page[data-page]').forEach(b => {
        b.addEventListener('click', () => {
            currentPartPage = parseInt(b.getAttribute('data-page'), 10);
            renderParticipantsTable();
        });
    });
}

function openStudentDetailModal(key) {
    const student = getStudentByKey(key);
    if (!student) return;

    const { full_name, email, grade, section, participant_type, student_id, guest_session_id, activities } = student;
    const modal = document.getElementById('part-detail-modal');
    if (!modal) return;

    const isReg = participant_type === 'registered';
    const initials = (full_name || 'ز').split(' ').map(w => w[0]).slice(0, 2).join('');
    const classText = grade ? `${grade}${section ? ' / ' + section : ''}` : 'غير محدد';

    // Avatar
    const avatarEl = document.getElementById('modal-avatar-initials');
    if (avatarEl) avatarEl.textContent = initials;

    // Header
    document.getElementById('modal-part-name').textContent = full_name || 'مشارك زائر';
    const badgeEl = document.getElementById('modal-part-badge');
    if (badgeEl) {
        badgeEl.textContent = isReg ? '🎓 طالب مسجل الدخول' : '🌐 مشارك دون حساب (زائر)';
        badgeEl.className = isReg ? 'badge badge-reg' : 'badge badge-guest';
    }
    const classBadge = document.getElementById('modal-class-badge');
    if (classBadge) classBadge.textContent = classText !== 'غير محدد' ? `📚 ${classText}` : '';

    // Info fields
    document.getElementById('modal-part-email').textContent = email || 'غير متوفر';
    document.getElementById('modal-part-class').textContent = classText;
    document.getElementById('modal-part-usertype').textContent = isReg ? 'حساب نظامي موثق' : 'مشاركة عامة عبر المتصفح';
    document.getElementById('modal-part-id').textContent =
        student_id ? `ID: ${student_id}` : `Session: ${guest_session_id || 'غير متوفر'}`;

    // Reading level
    const reading = getReadingLevel(activities);
    const readingEl = document.getElementById('modal-reading-level');
    if (readingEl) {
        if (reading) {
            readingEl.textContent = `المستوى ${reading.level}${reading.title ? ' — ' + reading.title : ''}`;
            readingEl.style.color = 'var(--color-primary)';
        } else {
            readingEl.textContent = 'لم يشارك في تحدي القراءة';
            readingEl.style.color = 'var(--color-text-muted)';
        }
    }

    // All activities
    const actList = document.getElementById('modal-all-activities');
    if (actList) {
        if (activities.length === 0) {
            actList.innerHTML = '<p style="color: var(--color-text-muted);">لا توجد أنشطة مسجلة.</p>';
        } else {
            actList.innerHTML = activities.map(a => buildActivityCard(a)).join('');
        }
    }

    modal.style.display = 'flex';
}

function buildActivityCard(a) {
    const d = a.details || {};
    const statusMap = {
        'completed': { label: 'مكتمل ✓', color: '#22c55e' },
        'submitted': { label: 'تم التسليم', color: '#3b82f6' },
        'evaluated': { label: 'مقيّم', color: '#22c55e' },
        'under_review': { label: 'قيد المراجعة', color: '#f59e0b' },
        'in_progress': { label: 'قيد الإنجاز', color: '#f59e0b' },
        'started': { label: 'بدأ المحاولة', color: '#3b82f6' }
    };
    const st = statusMap[a.status] || { label: a.status || '-', color: '#6b7280' };

    let icon = '📋';
    let typeLabel = 'نشاط';
    let accentColor = '#6366f1';
    if (a.activity_type === 'competition') { icon = '🏆'; typeLabel = 'مسابقة السراج'; accentColor = '#eab308'; }
    else if (a.activity_type === 'reading') { icon = '📚'; typeLabel = 'تحدي القراءة'; accentColor = '#10b981'; }
    else if (a.activity_type === 'research') { icon = '🔬'; typeLabel = 'البحث العلمي'; accentColor = '#8b5cf6'; }

    let extraDetails = '';
    if (a.activity_type === 'reading' && (d.level_number || d.level_title)) {
        extraDetails = `<div class="act-card-detail"><span>المرحلة:</span> <strong>رقم ${d.level_number || '-'} — ${d.level_title || ''}</strong></div>`;
        if (d.challenge_title) extraDetails += `<div class="act-card-detail"><span>البرنامج:</span> <strong>${escapeHtml(d.challenge_title)}</strong></div>`;
    } else if (a.activity_type === 'competition') {
        if (d.started_at) extraDetails += `<div class="act-card-detail"><span>بدأ:</span> <strong>${formatArabicDate(d.started_at)}</strong></div>`;
        if (d.submitted_at) extraDetails += `<div class="act-card-detail"><span>سُلّم:</span> <strong>${formatArabicDate(d.submitted_at)}</strong></div>`;
        if (d.duration_seconds) extraDetails += `<div class="act-card-detail"><span>المدة المقررة:</span> <strong>${Math.ceil(d.duration_seconds / 60)} دقيقة</strong></div>`;
    } else if (a.activity_type === 'research') {
        if (d.field) extraDetails += `<div class="act-card-detail"><span>المجال:</span> <strong>${escapeHtml(d.field)}</strong></div>`;
        if (d.summary) extraDetails += `<div class="act-card-detail" style="grid-column:span 2;"><span>الملخص:</span> <span>${escapeHtml(d.summary.substring(0, 120))}${d.summary.length > 120 ? '...' : ''}</span></div>`;
        if (d.file_url) extraDetails += `<div class="act-card-detail" style="grid-column:span 2;"><a href="${escapeHtml(d.file_url)}" target="_blank" class="btn btn-outline" style="font-size:0.78rem; padding:0.3rem 0.7rem;">📄 فتح ملف البحث ↗</a></div>`;
    }

    return `
        <div class="modal-act-card" style="--act-accent: ${accentColor};">
            <div class="modal-act-card-header">
                <div class="modal-act-card-type">${icon} ${typeLabel}</div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <span class="badge" style="background: ${st.color}20; color: ${st.color}; border: 1px solid ${st.color}40;">${st.label}</span>
                    ${a.score !== null && a.score !== undefined ? `<span class="modal-act-score">${a.score} نقطة</span>` : ''}
                </div>
            </div>
            <div class="modal-act-card-name">${escapeHtml(a.activity_name || '-')}</div>
            <div class="modal-act-card-details">
                <div class="act-card-detail"><span>تاريخ المشاركة:</span> <strong>${formatArabicDate(a.created_at)}</strong></div>
                ${extraDetails}
            </div>
        </div>
    `;
}

function openParticipantDetailModal(recordId) {
    const record = allParticipantsData.find(p => p.id === recordId);
    if (!record) return;
    const isReg = record.participant_type === 'registered';
    const key = isReg && record.student_id
        ? 'reg_' + record.student_id
        : 'guest_' + (record.guest_session_id || record.full_name || record.id);
    openStudentDetailModal(key);
}

function exportParticipantsToCSV() {
    if (filteredParticipants.length === 0) {
        window.Toast?.error('لا توجد بيانات مشاركين لتصديرها وفق الفلاتر الحالية.');
        return;
    }

    // CSV Headers
    const headers = [
        'الاسم الكامل',
        'نوع الحساب',
        'المدرسة',
        'البريد الإلكتروني',
        'الصف',
        'الشعبة',
        'نوع النشاط',
        'اسم النشاط / الفعالية',
        'تاريخ المشاركة',
        'الدرجة',
        'الحالة'
    ];

    const actTypeMap = {
        'competition': 'مسابقة السراج',
        'reading': 'تحديات القراءة',
        'research': 'البحث العلمي'
    };

    const userTypeMap = {
        'registered': 'طالب مسجل',
        'guest': 'مشارك زائر'
    };

    const rows = filteredParticipants.map(p => {
        const isAbuObaida = !p.school_type || p.school_type === 'abu_obaida';
        const schoolName = isAbuObaida ? 'مدرسة أبو عبيدة بن الجراح' : (p.school_name || 'مدرسة أخرى');
        return [
            `"${(p.full_name || '').replace(/"/g, '""')}"`,
            `"${userTypeMap[p.participant_type] || p.participant_type}"`,
            `"${schoolName.replace(/"/g, '""')}"`,
            `"${(p.email || '').replace(/"/g, '""')}"`,
            `"${(p.grade || '').replace(/"/g, '""')}"`,
            `"${(p.section || '').replace(/"/g, '""')}"`,
            `"${actTypeMap[p.activity_type] || p.activity_type}"`,
            `"${(p.activity_name || '').replace(/"/g, '""')}"`,
            `"${formatArabicDate(p.created_at)}"`,
            `"${p.score !== null && p.score !== undefined ? p.score : ''}"`,
            `"${(p.status || '').replace(/"/g, '""')}"`
        ];
    });

    // UTF-8 BOM (\uFEFF) ensures Arabic renders accurately in Microsoft Excel
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `siraj_participants_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    window.Toast?.success(`تم تصدير ${filteredParticipants.length} سجل مشاركة بنجاح إلى ملف CSV.`);
}

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatArabicDate(isoStr) {
    if (!isoStr) return '-';
    try {
        const d = new Date(isoStr);
        return d.toLocaleDateString('ar-OM', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return isoStr;
    }
}

