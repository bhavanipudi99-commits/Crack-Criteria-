const parseNumericalData = (label) => {
    if (!label) return null;
    const match = label.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z/%]+(?: [a-zA-Z/%]+)*)?/);
    if (!match) return null;
    const number = match[1];
    const suffix = match[2] ? match[2].trim() : '';
    const redacted = label.replace(number, '___');
    return { number, suffix, redacted, original: label };
};

const labels = [
  "Systolic BP < 90 mm Hg",
  "Age >= 65 years",
  "Ejection Fraction 40%",
  "Fever > 38.5 C",
  "Random 123",
  "Heart Rate > 100 bpm",
  "Less than 50"
];

console.log(labels.map(parseNumericalData));
