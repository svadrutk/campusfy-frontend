'use client';

import { useState, useEffect } from 'react';
import { normalizeSearchQuery, expandSearchQuery } from '@/utils/departmentUtils';

export default function DepartmentMappingTest() {
  const [query, setQuery] = useState('');
  const [normalizedQuery, setNormalizedQuery] = useState('');
  const [expandedQueries, setExpandedQueries] = useState<string[]>([]);
  
  // Test cases for demonstration
  const testCases = [
    'CS',
    'CS 300',
    'COMPSCI',
    'COMPSCI300',
    'Population Health',
    'accounting',
    'RMI300',
    'RMI 300',
    'R M I 300'
  ];
  
  // Update normalized and expanded queries when input changes
  useEffect(() => {
    if (query) {
      const normalized = normalizeSearchQuery(query);
      setNormalizedQuery(normalized);
      setExpandedQueries(expandSearchQuery(query));
    } else {
      setNormalizedQuery('');
      setExpandedQueries([]);
    }
  }, [query]);
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Department Mapping Test</h1>
      
      <div className="mb-6">
        <label htmlFor="query" className="block text-sm font-new-spirit-medium text-gray-700 mb-1">
          Enter a department or course code:
        </label>
        <input
          type="text"
          id="query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="e.g. CS, RMI300, etc."
        />
      </div>
      
      {query && (
        <div className="mb-6 p-4 bg-gray-50 rounded-md">
          <h2 className="text-lg font-semibold mb-2">Results:</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-new-spirit-medium text-gray-700">Original Query:</p>
              <p className="text-lg">{query}</p>
            </div>
            <div>
              <p className="text-sm font-new-spirit-medium text-gray-700">Normalized Query:</p>
              <p className="text-lg">{normalizedQuery}</p>
            </div>
          </div>
          
          {expandedQueries.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-new-spirit-medium text-gray-700">Expanded Queries:</p>
              <ul className="list-disc pl-5 mt-1">
                {expandedQueries.map((q, index) => (
                  <li key={index} className="text-md">{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Test Cases:</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testCases.map((testCase, index) => (
            <div 
              key={index} 
              className="p-4 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50"
              onClick={() => setQuery(testCase)}
            >
              <p className="font-new-spirit-medium">{testCase}</p>
              <p className="text-sm text-gray-500 mt-1">
                → {normalizeSearchQuery(testCase)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 