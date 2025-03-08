'use client';

import { useState } from 'react';

export default function Home() {
  const [query, setQuery] = useState('');
  const [cypherQuery, setCypherQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to process query');
      }
      
      const data = await response.json();
      setCypherQuery(data.cypher_query);
      setResults(data.results || []);
    } catch (err) {
      console.error('Error:', err);
      setError('An error occurred while processing your request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8">
      <div className="w-full max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          SELinux Policy Analyzer
        </h1>
        
        <form onSubmit={handleSubmit} className="mb-8">
          <textarea
            className="w-full p-4 border border-gray-300 rounded-md min-h-[120px] mb-4"
            placeholder="Enter your natural language query here..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Analyze'}
          </button>
          
          {error && (
            <p className="text-red-500 mt-2">{error}</p>
          )}
        </form>
        
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-md shadow">
            <h2 className="text-xl font-semibold mb-3">Generated Cypher Query:</h2>
            <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto">
              {cypherQuery || 'No query generated yet'}
            </pre>
          </div>
          
          <div className="bg-white p-6 rounded-md shadow">
            <h2 className="text-xl font-semibold mb-3">Results:</h2>
            {results.length > 0 ? (
              <ul className="space-y-2">
                {results.map((result, idx) => (
                  <li key={idx} className="bg-gray-100 p-3 rounded-md">
                    <pre>{JSON.stringify(result, null, 2)}</pre>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No results available</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}