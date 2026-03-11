// 澳门理工大学（MPU）学位、学院、专业 — 依官网整理
// 官网：https://www.mpu.edu.mo/zh/index.php
// 学士/硕士/博士课程：https://www.mpu.edu.mo/esca/zh/ （招生处）
// 学院简称：FCA 应用科学学院, FHSS 健康科学及体育学院, FLT 语言及翻译学院,
//          FAD 艺术及设计学院, FHS 人文及社会科学学院, FCE 管理科学学院

/** 学位：中文（英文），先选学位再选学院 */
export const DEGREES = [
  { label: '学士 (Bachelor)', value: '学士' },
  { label: '硕士 (Master)', value: '硕士' },
  { label: '博士 (Doctoral)', value: '博士' },
];

/**
 * 按学位可选的学院，学院名称后标注英文简称（与澳门理工大学官网一致）
 */
export const COLLEGES_BY_DEGREE = {
  学士: [
    { label: '应用科学学院 (FCA)', value: '应用科学学院', en: 'FCA', fullEn: 'Faculty of Applied Sciences' },
    { label: '健康科学及体育学院 (FHSS)', value: '健康科学及体育学院', en: 'FHSS', fullEn: 'Faculty of Health Sciences and Sports' },
    { label: '语言及翻译学院 (FLT)', value: '语言及翻译学院', en: 'FLT', fullEn: 'Faculty of Languages and Translation' },
    { label: '艺术及设计学院 (FAD)', value: '艺术及设计学院', en: 'FAD', fullEn: 'Faculty of Arts and Design' },
    { label: '人文及社会科学学院 (FHS)', value: '人文及社会科学学院', en: 'FHS', fullEn: 'Faculty of Humanities and Social Sciences' },
    { label: '管理科学学院 (FCE)', value: '管理科学学院', en: 'FCE', fullEn: 'Faculty of Business' },
    { label: '北京大学医学部——澳门理工大学护理书院 (Nursing Academy)', value: '北京大学医学部——澳门理工大学护理书院', en: 'Nursing Academy', fullEn: 'Peking University Health Science Center - MPU Nursing Academy' },
  ],
  硕士: [
    { label: '应用科学学院 (FCA)', value: '应用科学学院', en: 'FCA', fullEn: 'Faculty of Applied Sciences' },
    { label: '健康科学及体育学院 (FHSS)', value: '健康科学及体育学院', en: 'FHSS', fullEn: 'Faculty of Health Sciences and Sports' },
    { label: '语言及翻译学院 (FLT)', value: '语言及翻译学院', en: 'FLT', fullEn: 'Faculty of Languages and Translation' },
    { label: '艺术及设计学院 (FAD)', value: '艺术及设计学院', en: 'FAD', fullEn: 'Faculty of Arts and Design' },
    { label: '人文及社会科学学院 (FHS)', value: '人文及社会科学学院', en: 'FHS', fullEn: 'Faculty of Humanities and Social Sciences' },
    { label: '管理科学学院 (FCE)', value: '管理科学学院', en: 'FCE', fullEn: 'Faculty of Business' },
  ],
  博士: [
    { label: '应用科学学院 (FCA)', value: '应用科学学院', en: 'FCA', fullEn: 'Faculty of Applied Sciences' },
    { label: '健康科学及体育学院 (FHSS)', value: '健康科学及体育学院', en: 'FHSS', fullEn: 'Faculty of Health Sciences and Sports' },
    { label: '语言及翻译学院 (FLT)', value: '语言及翻译学院', en: 'FLT', fullEn: 'Faculty of Languages and Translation' },
    { label: '人文及社会科学学院 (FHS)', value: '人文及社会科学学院', en: 'FHS', fullEn: 'Faculty of Humanities and Social Sciences' },
    { label: '管理科学学院 (FCE)', value: '管理科学学院', en: 'FCE', fullEn: 'Faculty of Business' },
  ],
};

/** 学士学位课程名称（与 admission_mainland 学位课程页一致） */
export const MAJORS_BY_COLLEGE = {
  '应用科学学院': [
    '中国与葡语系国家经贸关系学士学位',
    '人工智能理学士学位',
    '电脑学理学士学位',
  ],
  '健康科学及体育学院': [
    '言语语言治疗理学士学位课程',
    '生物医学技术理学士学位（药剂技术）',
    '生物医学技术理学士学位（检验技术）',
    '体育教育学士学位',
  ],
  '语言及翻译学院': [
    '葡萄牙语学士学位',
    '国际汉语教育学士学位（汉语母语者）',
    '国际汉语教育学士学位（非汉语母语者）',
    '中葡/葡中翻译学士学位（中、英文教育制度）',
    '中葡/葡中翻译学士学位（葡文教育制度）',
    '中英翻译学士学位',
  ],
  '艺术及设计学院': [
    '设计学士学位',
    '视觉艺术（美术/美术教育专业）学士学位',
    '音乐（教育/表演专业）学士学位',
    '媒体艺术学士学位',
  ],
  '人文及社会科学学院': [
    '公共行政学学士学位课程（葡文班）',
    '公共行政学学士学位课程（中文班）',
    '社会工作学学士学位课程',
  ],
  '管理科学学院': [
    '工商管理学士学位（博彩与娱乐管理）',
    '工商管理学士学位（市场学专业）',
    '管理学学士学位',
    '电子商务学士学位',
    '会计学学士学位',
  ],
  '北京大学医学部——澳门理工大学护理书院': [
    '护理学学士学位课程',
  ],
};

/** 硕士专业（按学院，与官网研究生课程对应） */
export const MASTER_MAJORS_BY_COLLEGE = {
  '应用科学学院': ['运动科技与创新硕士', '环境智能硕士', '大数据与物联网硕士'],
  '健康科学及体育学院': ['护理学硕士', '体育及运动硕士'],
  '语言及翻译学院': ['中葡笔译暨传译硕士'],
  '艺术及设计学院': ['跨领域艺术硕士'],
  '人文及社会科学学院': ['教育硕士（文化传播）', '公共行政管理硕士'],
  '管理科学学院': ['博彩管理工商管理硕士', '工商管理硕士', '金融与数据分析硕士'],
};

/** 博士专业（按学院） */
export const DOCTORAL_MAJORS_BY_COLLEGE = {
  '应用科学学院': ['人工智能智慧康养博士', '教育技术与创新博士', '人工智能药物发现博士', '计算机应用技术博士'],
  '健康科学及体育学院': ['体育学博士'],
  '语言及翻译学院': ['应用语言学博士', '葡萄牙语博士'],
  '人文及社会科学学院': ['文化遗产与人类学博士', '公共政策博士'],
  '管理科学学院': ['工商管理博士'],
};

export function getCollegesForDegree(degree) {
  const list = COLLEGES_BY_DEGREE[degree];
  return list || [];
}

export function getMajorsForCollege(collegeValue, degree) {
  if (!collegeValue) return [];
  if (degree === '硕士') return MASTER_MAJORS_BY_COLLEGE[collegeValue] || [];
  if (degree === '博士') return DOCTORAL_MAJORS_BY_COLLEGE[collegeValue] || [];
  return MAJORS_BY_COLLEGE[collegeValue] || [];
}

/** 学位显示：中文（英文），如 硕士 (Master) */
export function getDegreeDisplay(value) {
  const d = DEGREES.find((x) => x.value === value);
  return d ? d.label : value || '—';
}

/** 学院显示：中文（缩写），如 应用科学学院 (FCA)；兼容旧数据 */
const COLLEGE_ALIAS = {
  '商学院': '管理科学学院 (FCE)',
  '北京大学— MPU 护理学院': '北京大学医学部——澳门理工大学护理书院',
};

export function getCollegeDisplay(value) {
  if (COLLEGE_ALIAS[value]) return COLLEGE_ALIAS[value];
  for (const degree of Object.keys(COLLEGES_BY_DEGREE)) {
    const found = (COLLEGES_BY_DEGREE[degree] || []).find((c) => c.value === value);
    if (found) return found.label;
  }
  return value || '—';
}
