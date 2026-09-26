// src/__tests__/nlpEngine.test.js
// Unit tests for the rule-based NLP engine

const {
  classifyComplaint,
  analyzeSentiment,
  scorePriority,
  extractKeywords,
  analyzeComplaint,
} = require('../utils/nlpEngine');

describe('classifyComplaint()', () => {
  test('detects Infrastructure from pothole', () => {
    const { category } = classifyComplaint('There is a large pothole on the road');
    expect(category).toBe('Infrastructure');
  });

  test('detects Water Supply from pipe leak', () => {
    const { category } = classifyComplaint('Water pipe is leaking near school');
    expect(category).toBe('Water Supply');
  });

  test('detects Electricity from streetlight', () => {
    const { category } = classifyComplaint('Streetlight not working for two weeks');
    expect(category).toBe('Electricity');
  });

  test('detects Safety from exposed wire', () => {
    const { category } = classifyComplaint('Exposed live wire — very dangerous urgent');
    expect(category).toBe('Safety');
  });

  test('falls back to General for unknown text', () => {
    const { category } = classifyComplaint('Hello world');
    expect(category).toBe('General');
  });
});

describe('analyzeSentiment()', () => {
  test('returns Highly negative for strong negative words', () => {
    expect(analyzeSentiment('This is terrible and horrible condition')).toBe('Highly negative');
  });

  test('returns Negative for mild negative', () => {
    expect(analyzeSentiment('The road is broken and bad')).toBe('Negative');
  });

  test('returns Neutral for polite request', () => {
    expect(analyzeSentiment('Please fix the issue kindly')).toBe('Neutral');
  });
});

describe('scorePriority()', () => {
  test('Critical for urgent/dangerous text', () => {
    const { label } = scorePriority('This is an urgent emergency danger', 'General');
    expect(label).toBe('Critical');
  });

  test('Critical for Safety category', () => {
    const { label } = scorePriority('Exposed wire on road', 'Safety');
    expect(label).toBe('Critical');
  });

  test('Low for noise complaint', () => {
    const { label } = scorePriority('Neighbour is noisy at night', 'Noise');
    expect(label).toBe('Low');
  });
});

describe('analyzeComplaint()', () => {
  test('returns full analysis object', () => {
    const result = analyzeComplaint('Water pipe is leaking and it is very bad', 'Pipe leak');
    expect(result).toHaveProperty('category');
    expect(result).toHaveProperty('department');
    expect(result).toHaveProperty('priority');
    expect(result).toHaveProperty('sentiment');
    expect(result).toHaveProperty('keywords');
    expect(result).toHaveProperty('summary');
    expect(result.category).toBe('Water Supply');
  });
});

describe('extractKeywords()', () => {
  test('removes stop words and short tokens', () => {
    const kws = extractKeywords('There is a large pothole on the main road near bridge');
    expect(kws).not.toContain('the');
    expect(kws).not.toContain('is');
    expect(kws.some((k) => k.length > 3)).toBe(true);
  });
});
