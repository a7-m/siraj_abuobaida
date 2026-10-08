import { supabase } from '../services/supabase.js';
import './main.js'; // includes auth state updates

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const slug = urlParams.get('slug');
    
    if (!slug) {
        showError();
        return;
    }
    
    try {
        const { data: page, error } = await supabase
            .from('content_pages')
            .select('*')
            .eq('slug', slug)
            .single();
            
        if (error || !page) {
            throw error || new Error("Page not found");
        }
        
        renderPage(page);
        
    } catch (err) {
        console.error("Error loading page:", err);
        showError();
    }
});

function renderPage(page) {
    document.getElementById('page-loading').style.display = 'none';
    document.getElementById('page-content').style.display = 'block';
    
    document.title = `${page.title} | سراج`;
    document.getElementById('page-title').textContent = page.title;
    
    const dateStr = new Date(page.updated_at || page.created_at).toLocaleDateString('ar-EG', {
        year: 'numeric', month: 'long', day: 'numeric'
    });
    
    document.getElementById('page-meta').textContent = `آخر تحديث: ${dateStr}`;
    
    if (page.cover_image) {
        const cover = document.getElementById('page-cover');
        cover.src = page.cover_image;
        cover.style.display = 'block';
    }
    
    document.getElementById('page-body').innerHTML = page.content || '';
}

function showError() {
    document.getElementById('page-loading').style.display = 'none';
    document.getElementById('page-error').style.display = 'block';
}
