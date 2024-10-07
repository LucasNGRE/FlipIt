import { useState } from 'react';

const TestButton = () => {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Test Product',
          description: 'This is a test product.',
          price: 100,
          status: 'available', // Valeur correcte pour le status
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }

      const data = await res.json();
      setResponse(data);
    } catch (error) {
      console.error('Error:', error);
      setError((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button 
        onClick={handleClick} 
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        {loading ? 'Loading...' : 'Create Product'}
      </button>

      {response && (
        <div className="mt-4">
          <h4>Response:</h4>
          <pre>{JSON.stringify(response, null, 2)}</pre>
        </div>
      )}

      {error && (
        <div className="mt-4 text-red-500">
          <h4>Error:</h4>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default TestButton;
