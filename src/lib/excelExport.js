import * as XLSX from 'xlsx';

export function downloadMCQsAsExcel(questions, topic) {
  const data = questions.map((q, idx) => ({
    'Question No': idx + 1,
    'Topic': topic,
    'Question': q.question,
    'Option A': q.options?.[0] ?? '',
    'Option B': q.options?.[1] ?? '',
    'Option C': q.options?.[2] ?? '',
    'Option D': q.options?.[3] ?? '',
    'Correct Answer': String.fromCharCode(65 + q.correctAnswer),
    'Explanation': q.explanation,
    'Recommended For': q.recommendedFor
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'MCQs');
  
  // Design column widths
  const wscols = [
    { wch: 10 }, // Question No
    { wch: 20 }, // Topic
    { wch: 60 }, // Question
    { wch: 30 }, // Option A
    { wch: 30 }, // Option B
    { wch: 30 }, // Option C
    { wch: 30 }, // Option D
    { wch: 15 }, // Correct Answer
    { wch: 60 }, // Explanation
    { wch: 30 }, // Recommended For
  ];
  worksheet['!cols'] = wscols;

  XLSX.writeFile(workbook, `QuestAi_MCQs_${topic.replace(/\s+/g, '_')}.xlsx`);
}
