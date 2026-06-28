const DEFAULT_GRADING = [
  { min: 90, max: 100, grade: 'A+', remarks: 'Outstanding', points: 4.0 },
  { min: 80, max: 89, grade: 'A',  remarks: 'Excellent',   points: 4.0 },
  { min: 75, max: 79, grade: 'B+', remarks: 'Very Good',   points: 3.5 },
  { min: 70, max: 74, grade: 'B',  remarks: 'Good',        points: 3.0 },
  { min: 65, max: 69, grade: 'C+', remarks: 'Credit',      points: 2.5 },
  { min: 60, max: 64, grade: 'C',  remarks: 'Average',     points: 2.0 },
  { min: 55, max: 59, grade: 'D+', remarks: 'Pass',        points: 1.5 },
  { min: 50, max: 54, grade: 'D',  remarks: 'Pass',        points: 1.0 },
  { min: 0,  max: 49, grade: 'F',  remarks: 'Fail',        points: 0.0 },
];

function getGrade(score, gradingSystem = null) {
  const system = gradingSystem || DEFAULT_GRADING;
  const entry = system.find(g => score >= g.min && score <= g.max);
  return entry || { grade: 'F', remarks: 'Fail', points: 0.0 };
}

function calculatePosition(scores) {
  const sorted = [...scores].sort((a, b) => b.average - a.average);
  return sorted.map((s, i) => ({ ...s, position: i + 1 }));
}

function getPerformanceRemark(average) {
  if (average >= 90) return 'Excellent performance. Keep it up!';
  if (average >= 80) return 'Very good performance. Well done!';
  if (average >= 70) return 'Good performance. Keep working hard!';
  if (average >= 60) return 'Fair performance. More effort needed.';
  if (average >= 50) return 'Average performance. Must improve.';
  return 'Poor performance. Needs serious attention.';
}

function calculateWeightedScore(scores, weights) {
  // scores: { classTest, assignment, midTerm, endOfTerm }
  // weights: percentage for each component
  const w = weights || { classTest: 20, assignment: 10, midTerm: 20, endOfTerm: 50 };
  const total =
    (scores.classTest * w.classTest / 100) +
    (scores.assignment * w.assignment / 100) +
    (scores.midTerm * w.midTerm / 100) +
    (scores.endOfTerm * w.endOfTerm / 100);
  return Math.round(total * 100) / 100;
}

module.exports = { getGrade, calculatePosition, getPerformanceRemark, calculateWeightedScore, DEFAULT_GRADING };
