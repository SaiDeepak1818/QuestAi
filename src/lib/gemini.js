const getHeaders = () => {
  const token = localStorage.getItem('authToken');
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export async function generateCodingQuestions(topic, count, source = 'original', difficulty = 'Medium', context = {}) {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        type: 'coding',
        topic,
        count,
        source,
        difficulty,
        context
      })
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server returned status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Generate Coding Error:", error);
    throw error;
  }
}

export async function generateMCQs(topic, count, context = {}) {
  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        type: 'mcq',
        topic,
        count,
        context
      })
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server returned status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Generate MCQ Error:", error);
    throw error;
  }
}
