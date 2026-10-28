export type CourseCategoryKey = 'courses' | 'soft_skills' | 'aptitude' | 'portfolio' | 'resume' | 'linkedin';

export function getCourseCategory(course: any): CourseCategoryKey {
  const catStr = (course?.category || '').toLowerCase().trim();
  const titleStr = (course?.title || '').toLowerCase().trim();
  const checkStr = catStr || titleStr;

  if (checkStr.includes('soft') || checkStr.includes('communication')) {
    return 'soft_skills';
  } else if (checkStr.includes('aptitude') || checkStr.includes('reasoning')) {
    return 'aptitude';
  } else if (checkStr.includes('resume')) {
    return 'resume';
  } else if (checkStr.includes('portfolio') || checkStr.includes('capstone') || checkStr.includes('industry')) {
    return 'portfolio';
  } else if (checkStr.includes('linkedin') || checkStr.includes('networking')) {
    return 'linkedin';
  }
  return 'courses';
}

export const CATEGORY_ORDER: Record<string, number> = {
  courses: 1,
  soft_skills: 2,
  aptitude: 3,
  resume: 4,
  portfolio: 5,
  linkedin: 6,
};

export const CATEGORY_LABELS: Record<CourseCategoryKey, string> = {
  courses: 'Courses',
  soft_skills: 'Communication & Soft Skills',
  aptitude: 'Aptitude & Reasoning',
  resume: 'Resume',
  portfolio: 'Portfolio',
  linkedin: 'LinkedIn',
};
