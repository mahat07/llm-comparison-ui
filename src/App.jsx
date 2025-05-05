import { useState, useCallback } from 'react';
import './App.css';

function App() {
  const [sharedPrompt, setSharedPrompt] = useState('');
  const [responses, setResponses] = useState({
    anthropic: '',
    deepseek: '',
    llama: ''
  });
  const [loading, setLoading] = useState({
    anthropic: false,
    deepseek: false,
    llama: false
  });
  const [responseOrder, setResponseOrder] = useState([]);

  const models = [
    { id: 'anthropic', name: 'Anthropic (Claude)', color: '#9B59B6' },
    { id: 'deepseek', name: 'DeepSeek (R1 Distill Qwen 7B)', color: '#1F618D' },
    { id: 'llama', name: 'LLaMA (3.2 1B Instruct)', color: '#F39C12' }
  ];

  // 🧠 Formatter Function
  const formatModelResponse = (raw, model) => {
    let parsed;
    try {
      parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      return 'Invalid response format';
    }

    let content = '';

    switch (model) {
      case 'deepseek':
      case 'llama':
        return parsed?.choices?.[0]?.message?.content?.trim() || 'No content found';
      case 'anthropic':
        return parsed?.content?.[0]?.text?.trim() || 'No content found';
      default:
        return 'Unsupported model format';
    }

    content = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

    return content || 'No content found';
  };

  const handlePromptChange = useCallback((value) => {
    setSharedPrompt(value);
  }, []);

  const fetchModelResponse = useCallback(async (model, prompt) => {
    try {
      const encodedPrompt = encodeURIComponent(prompt);
      const response = await fetch(`http://localhost:8081/api/${model}/${encodedPrompt}`);
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      const data = await response.text();
      return data;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!sharedPrompt.trim()) return;

    setResponseOrder([]);

    setLoading({
      anthropic: true,
      deepseek: true,
      llama: true
    });

    setResponses({
      anthropic: 'Loading...',
      deepseek: 'Loading...',
      llama: 'Loading...'
    });

    models.forEach(model => {
      fetchModelResponse(model.id, sharedPrompt)
        .then(rawResponse => {
          const formatted = formatModelResponse(rawResponse, model.id);
          setResponses(prev => ({
            ...prev,
            [model.id]: formatted
          }));

          setResponseOrder(prev => [...prev, model.id]);
          setLoading(prev => ({
            ...prev,
            [model.id]: false
          }));
        })
        .catch(error => {
          setResponses(prev => ({
            ...prev,
            [model.id]: `Error: ${error.message}`
          }));

          setLoading(prev => ({
            ...prev,
            [model.id]: false
          }));
        });
    });
  }, [sharedPrompt, fetchModelResponse]);

  const isLoading = Object.values(loading).some(status => status);

  return (
    <div className="app-container">
      <h1>Exploring Different LLM Models</h1>

      <div className="shared-prompt-container">
        <div className="shared-prompt-area">
          <textarea
            placeholder="Enter a prompt to send to all models..."
            value={sharedPrompt}
            onChange={(e) => handlePromptChange(e.target.value)}
            disabled={isLoading}
          />

          <button
            onClick={handleSubmit}
            disabled={isLoading || !sharedPrompt.trim()}
            className="submit-all-btn"
          >
            {isLoading ? 'Sending...' : 'Compare All Models'}
          </button>
        </div>
      </div>

      {responseOrder.length > 0 && (
        <div className="response-order">
          <h3>Response Order:</h3>
          <ol>
            {responseOrder.map((modelId, index) => {
              const model = models.find(m => m.id === modelId);
              return (
                <li key={modelId} style={{ color: model.color }}>
                  {model.name} {index === 0 ? '(fastest)' : ''}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="model-grid">
        {models.map(model => (
          <div
            key={model.id}
            className="model-box"
            style={{
              borderColor: model.color,
              boxShadow: responseOrder[0] === model.id ? `0 0 15px ${model.color}` : 'none'
            }}
          >
            <h2 style={{ color: model.color }}>
              {model.name}
              {responseOrder.includes(model.id) && (
                <span className="response-badge">
                  {responseOrder.indexOf(model.id) + 1}
                </span>
              )}
            </h2>

            <div className="response-area">
              <h3>Response:</h3>
              <div className="response-content">
                {responses[model.id] ? (
                  <div className="response-text">{responses[model.id]}</div>
                ) : (
                  <div className="placeholder-text">Response will appear here</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
