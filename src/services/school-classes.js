/**
 * School Classes and Sections Service
 * ─────────────────────────────────────────────────────────────
 * Dynamically loads and caches active grades and sections from 
 * the `school_sections` table in Supabase for Abu Obaida School.
 */

import { supabase } from './supabase.js';

let _cachedClasses = null;

// Fallback in case network / Supabase is temporarily unreachable
const FALLBACK_CLASSES = {
  grades: ['10', '11', '12'],
  sectionsByGrade: {
    '10': ['10/1', '10/2', '10/3', '10/4', '10/5', '10/6', '10/7', '10/8', '10/9', '10/10', '10/11'],
    '11': ['11/1', '11/2', '11/3', '11/4', '11/5'],
    '12': ['12/1', '12/2', '12/3', '12/4'],
    'العاشر': ['1', '2', '3', '4', '5', '6'],
    'الحادي عشر': ['1', '2', '3', '4', '5'],
    'الثاني عشر': ['1', '2', '3', '4']
  },
  rawSections: []
};

/**
 * Format human-readable grade label
 */
export function formatGradeLabel(grade) {
  if (!grade) return '';
  const g = String(grade).trim();
  if (g === '10') return 'الصف العاشر (10)';
  if (g === '11') return 'الصف الحادي عشر (11)';
  if (g === '12') return 'الصف الثاني عشر (12)';
  if (g.startsWith('الصف')) return g;
  return `الصف ${g}`;
}

/**
 * Format human-readable section label
 */
export function formatSectionLabel(sectionName) {
  if (!sectionName) return '';
  const s = String(sectionName).trim();
  if (s.startsWith('شعبة') || s.startsWith('الشعبة')) return s;
  return `شعبة ${s}`;
}

/**
 * Fetch active grades and sections from Supabase school_sections
 * @param {boolean} forceRefresh - If true, bypass in-memory cache
 * @returns {Promise<{ grades: string[], sectionsByGrade: Object.<string, string[]>, rawSections: Array }>}
 */
export async function getSchoolClasses(forceRefresh = false) {
  if (_cachedClasses && !forceRefresh) {
    return _cachedClasses;
  }

  // Check sessionStorage for fast tab persistence
  if (!forceRefresh) {
    try {
      const stored = sessionStorage.getItem('siraj_school_classes');
      if (stored) {
        _cachedClasses = JSON.parse(stored);
        if (_cachedClasses?.grades?.length > 0) {
          return _cachedClasses;
        }
      }
    } catch (e) {
      console.warn('Could not read cached classes from sessionStorage:', e);
    }
  }

  if (!supabase) {
    _cachedClasses = FALLBACK_CLASSES;
    return FALLBACK_CLASSES;
  }

  try {
    const { data, error } = await supabase
      .from('school_sections')
      .select('id, grade, section_name, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error || !data || data.length === 0) {
      console.warn('Could not fetch active school_sections, using fallback', error);
      _cachedClasses = FALLBACK_CLASSES;
      return FALLBACK_CLASSES;
    }

    const sectionsByGrade = {};
    const gradesSet = [];

    data.forEach(item => {
      const grade = String(item.grade).trim();
      const section = String(item.section_name).trim();

      if (!sectionsByGrade[grade]) {
        sectionsByGrade[grade] = [];
        gradesSet.push(grade);
      }
      if (!sectionsByGrade[grade].includes(section)) {
        sectionsByGrade[grade].push(section);
      }
    });

    _cachedClasses = {
      grades: gradesSet,
      sectionsByGrade,
      rawSections: data
    };

    try {
      sessionStorage.setItem('siraj_school_classes', JSON.stringify(_cachedClasses));
    } catch (e) {}

    return _cachedClasses;
  } catch (err) {
    console.error('Error fetching school_sections:', err);
    _cachedClasses = FALLBACK_CLASSES;
    return FALLBACK_CLASSES;
  }
}

/**
 * Fetch sections for a specific grade from Supabase (or cached list)
 */
export async function getSectionsForGrade(grade) {
  if (!grade) return [];
  const classes = await getSchoolClasses();
  if (classes.sectionsByGrade[grade]) {
    return classes.sectionsByGrade[grade];
  }
  // Try matching normalized grade (e.g. '10' vs 'العاشر')
  if (grade === 'العاشر' && classes.sectionsByGrade['10']) {
    return classes.sectionsByGrade['10'];
  }
  if (grade === '10' && classes.sectionsByGrade['العاشر']) {
    return classes.sectionsByGrade['العاشر'];
  }
  if (grade === 'الحادي عشر' && classes.sectionsByGrade['11']) {
    return classes.sectionsByGrade['11'];
  }
  if (grade === '11' && classes.sectionsByGrade['الحادي عشر']) {
    return classes.sectionsByGrade['الحادي عشر'];
  }
  if (grade === 'الثاني عشر' && classes.sectionsByGrade['12']) {
    return classes.sectionsByGrade['12'];
  }
  if (grade === '12' && classes.sectionsByGrade['الثاني عشر']) {
    return classes.sectionsByGrade['الثاني عشر'];
  }
  return FALLBACK_CLASSES.sectionsByGrade[grade] || ['1', '2', '3', '4'];
}
