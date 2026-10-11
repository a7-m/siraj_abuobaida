/**
 * Teacher Media & Storage Explorer Module
 * منصة السراج – مدرسة أبو عبيدة
 * Complete browser for Supabase Storage buckets (public_assets, research_files)
 */

import { initTeacherAdmin, showConfirmModal, escapeHtml, formatDate, debounce } from './teacher-nav.js';
import { supabase } from '../services/supabase.js';
import { Toast } from '../utils/toast.js';

let currentBucket = 'public_assets';
let allFiles = [];
let searchQuery = '';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initTeacherAdmin('media');
    setupEvents();
    await loadBucketFiles();
  } catch (err) {
    console.error('Media module init error:', err);
  }
});

function setupEvents() {
  const bucketSelect = document.getElementById('media-bucket-select');
  const searchInput = document.getElementById('media-search');
  const btnUpload = document.getElementById('btn-upload-media');
  const uploadModal = document.getElementById('media-upload-modal');
  const btnCloseModal = document.getElementById('btn-close-upload-modal');
  const btnCancelUpload = document.getElementById('btn-cancel-upload');
  const dropzone = document.getElementById('media-dropzone');
  const fileInput = document.getElementById('media-file-input');

  if (bucketSelect) {
    bucketSelect.addEventListener('change', (e) => {
      currentBucket = e.target.value;
      loadBucketFiles();
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', debounce((e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderGrid();
    }, 250));
  }

  if (btnUpload) {
    btnUpload.addEventListener('click', () => {
      uploadModal.classList.add('active');
    });
  }

  if (btnCloseModal) btnCloseModal.addEventListener('click', closeUploadModal);
  if (btnCancelUpload) btnCancelUpload.addEventListener('click', closeUploadModal);

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = 'var(--color-primary)';
      dropzone.style.background = 'rgba(79, 70, 229, 0.05)';
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.style.borderColor = '';
      dropzone.style.background = '';
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '';
      dropzone.style.background = '';
      if (e.dataTransfer.files?.length) {
        uploadFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files?.length) {
        uploadFile(e.target.files[0]);
      }
    });
  }
}

function closeUploadModal() {
  const uploadModal = document.getElementById('media-upload-modal');
  if (uploadModal) uploadModal.classList.remove('active');
  const statusText = document.getElementById('upload-status-text');
  if (statusText) statusText.style.display = 'none';
  const fileInput = document.getElementById('media-file-input');
  if (fileInput) fileInput.value = '';
}

async function loadBucketFiles() {
  const container = document.getElementById('media-grid-container');
  if (!container) return;

  container.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--color-text-muted);">جاري فحص ملفات المستودع السحابي... ⏳</div>';

  allFiles = [];

  try {
    const foldersToScan = currentBucket === 'public_assets' 
      ? ['', 'content-covers', 'questions', 'competitions', 'general']
      : ['', 'submissions', 'student_docs'];

    for (const folder of foldersToScan) {
      const { data, error } = await supabase.storage
        .from(currentBucket)
        .list(folder, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

      if (error) {
        console.warn(`Could not list folder "${folder}":`, error.message);
        continue;
      }

      (data || []).forEach(item => {
        // Skip .emptyFolderPlaceholder
        if (item.name && !item.name.startsWith('.') && item.id) {
          const fullPath = folder ? `${folder}/${item.name}` : item.name;
          
          let publicUrl = '';
          if (currentBucket === 'public_assets') {
            const { data: urlData } = supabase.storage.from(currentBucket).getPublicUrl(fullPath);
            publicUrl = urlData.publicUrl;
          }

          allFiles.push({
            name: item.name,
            path: fullPath,
            size: item.metadata?.size || item.size || 0,
            createdAt: item.created_at || item.updated_at,
            publicUrl,
            folder: folder || 'الجذر'
          });
        }
      });
    }

    renderGrid();
  } catch (err) {
    console.error('Error listing storage files:', err);
    container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: #ef4444; padding: 2rem;">تعذر جلب ملفات المستودع: ${escapeHtml(err.message)}</div>`;
  }
}

function renderGrid() {
  const container = document.getElementById('media-grid-container');
  if (!container) return;

  const filtered = allFiles.filter(f => {
    return !searchQuery || f.name.toLowerCase().includes(searchQuery) || f.path.toLowerCase().includes(searchQuery);
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1;">
        <div class="td-empty-state">
          <div class="td-empty-icon">📁</div>
          <div class="td-empty-title">لا توجد ملفات في هذا المستودع</div>
          <div class="td-empty-desc">المستودع فارغ أو لا توجد ملفات تطابق كلمة البحث الحالية.</div>
          <button class="btn btn-primary" onclick="document.getElementById('btn-upload-media').click()">📤 رفع أول ملف</button>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(f => {
    const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(f.name);
    const isPdf = /\.pdf$/i.test(f.name);
    const formattedSize = f.size > 1024 * 1024 
      ? (f.size / (1024 * 1024)).toFixed(1) + ' MB'
      : (f.size / 1024).toFixed(0) + ' KB';

    return `
      <div class="media-card">
        <div class="media-card-preview">
          ${isImage && f.publicUrl ? `
            <img src="${escapeHtml(f.publicUrl)}" alt="${escapeHtml(f.name)}" loading="lazy">
          ` : `
            <span style="font-size: 3rem;">${isPdf ? '📕' : '📄'}</span>
          `}
        </div>
        <div class="media-card-body">
          <div class="media-card-name" title="${escapeHtml(f.name)}">
            ${escapeHtml(f.name)}
          </div>
          <div class="media-card-meta">
            <span>📁 ${escapeHtml(f.folder)}</span>
            <span>${formattedSize}</span>
          </div>
          <div class="media-card-actions">
            ${f.publicUrl ? `
              <button class="btn btn-outline btn-sm btn-copy-link" data-url="${escapeHtml(f.publicUrl)}" style="flex: 1;">🔗 نسخ الرابط</button>
              <a href="${escapeHtml(f.publicUrl)}" target="_blank" class="btn btn-outline btn-sm" title="فتح الملف">👁️</a>
            ` : ''}
            <button class="btn btn-outline-danger btn-sm btn-del-file" data-path="${escapeHtml(f.path)}" title="حذف الملف">🗑️</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Bind actions
  container.querySelectorAll('.btn-copy-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.url;
      navigator.clipboard.writeText(url).then(() => {
        Toast.success('تم نسخ رابط الملف إلى الحافظة بنجاح');
      }).catch(() => {
        Toast.error('تعذر النسخ التلقائي، يمكنك نسخه يدوياً من الرابط');
      });
    });
  });

  container.querySelectorAll('.btn-del-file').forEach(btn => {
    btn.addEventListener('click', () => {
      const path = btn.dataset.path;
      confirmDeleteFile(path);
    });
  });
}

async function uploadFile(file) {
  if (!file) return;

  if (file.size > 15 * 1024 * 1024) {
    Toast.error('حجم الملف يتجاوز الحد المسموح (15 ميجابايت)');
    return;
  }

  const folder = document.getElementById('upload-target-folder').value || 'general';
  const statusText = document.getElementById('upload-status-text');
  
  if (statusText) {
    statusText.style.display = 'block';
    statusText.textContent = `جاري رفع الملف «${file.name}» إلى ${currentBucket}/${folder}... ⏳`;
  }

  try {
    const ext = file.name.split('.').pop();
    const cleanBase = file.name.substring(0, file.name.lastIndexOf('.')).replace(/[^\w\u0621-\u064A\-]/g, '_');
    const fileName = `${folder}/${Date.now()}_${cleanBase}.${ext}`;

    const { error } = await supabase.storage
      .from(currentBucket)
      .upload(fileName, file, { cacheControl: '3600', upsert: true });

    if (error) throw error;

    Toast.success(`تم رفع الملف «${file.name}» بنجاح`);
    closeUploadModal();
    await loadBucketFiles();
  } catch (err) {
    console.error('File upload error:', err);
    Toast.error('تعذر رفع الملف: ' + err.message);
    if (statusText) statusText.textContent = 'فشل الرفع: ' + err.message;
  }
}

function confirmDeleteFile(filePath) {
  showConfirmModal({
    title: 'حذف الملف من المستودع السحابي',
    message: `هل أنت متأكد من حذف الملف «${filePath}» نهائياً من المستودع؟ الروابط المرتبطة بهذا الملف قد تتعطل.`,
    confirmText: 'نعم، حذف الملف',
    confirmClass: 'btn-danger',
    onConfirm: async () => {
      try {
        const { error } = await supabase.storage
          .from(currentBucket)
          .remove([filePath]);

        if (error) throw error;

        allFiles = allFiles.filter(f => f.path !== filePath);
        Toast.success('تم حذف الملف بنجاح');
        renderGrid();
      } catch (err) {
        console.error('File delete error:', err);
        Toast.error('تعذر حذف الملف: ' + err.message);
      }
    }
  });
}
