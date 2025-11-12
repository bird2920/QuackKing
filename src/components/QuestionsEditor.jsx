// QuestionsEditor.jsx
// Interactive editor for loaded trivia questions - edit text, answers, and options inline.
import React, { useState, useEffect } from 'react';

const QuestionsEditor = ({ questions = [], onSave, isHost }) => {
  const [editedQuestions, setEditedQuestions] = useState(questions);
  const [expandedIndex, setExpandedIndex] = useState(null);

  // Sync with questions prop
  useEffect(() => {
    setEditedQuestions(questions);
    setExpandedIndex(null);
  }, [questions]);

  // Update a specific field in a question
  const updateQuestion = (index, field, value) => {
    const updated = [...editedQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setEditedQuestions(updated);
  };

  // Update an option at a specific position
  const updateOption = (qIndex, optIndex, value) => {
    const updated = [...editedQuestions];
    const newOptions = [...updated[qIndex].options];
    newOptions[optIndex] = value;
    updated[qIndex] = { ...updated[qIndex], options: newOptions };
    setEditedQuestions(updated);
  };

  // Delete a question
  const deleteQuestion = (index) => {
    const updated = editedQuestions.filter((_, i) => i !== index);
    setEditedQuestions(updated);
    if (expandedIndex === index) setExpandedIndex(null);
  };

  // Save all changes
  const handleSave = () => {
    if (onSave) onSave(editedQuestions);
  };

  if (!isHost) return null;
  if (questions.length === 0) return null;

  return (
    <div className="w-full max-w-5xl sm:max-w-6xl mx-auto mt-6 p-4 sm:p-6 bg-gray-800 rounded-xl shadow-2xl">
      <div className="flex justify-between items-center mb-4 border-b border-gray-600 pb-2">
        <h3 className="text-2xl font-bold text-white">
          Questions Editor ({editedQuestions.length})
        </h3>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition"
        >
          Save Changes
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {editedQuestions.map((q, idx) => (
          <div
            key={q.id || idx}
            className="bg-gray-700 rounded-lg shadow-md overflow-hidden"
          >
            {/* Question Header - Click to expand */}
            <div
              onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
              className="p-4 cursor-pointer hover:bg-gray-650 transition flex justify-between items-start"
            >
              <div className="flex-grow">
                <span className="text-indigo-400 font-bold mr-2">Q{idx + 1}:</span>
                <span className="text-white">{q.question}</span>
              </div>
              <div className="flex gap-2 items-center flex-shrink-0">
                <span className="text-xs text-green-400">✓ {q.correctAnswer}</span>
                <span className="text-gray-400">
                  {expandedIndex === idx ? '▼' : '▶'}
                </span>
              </div>
            </div>

            {/* Expanded Editor */}
            {expandedIndex === idx && (
              <div className="p-4 bg-gray-750 border-t border-gray-600 space-y-3">
                {/* Question Text */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1">
                    Question Text:
                  </label>
                  <input
                    type="text"
                    value={q.question}
                    onChange={(e) => updateQuestion(idx, 'question', e.target.value)}
                    className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white"
                  />
                </div>

                {/* Correct Answer */}
                <div>
                  <label className="block text-sm font-semibold text-green-400 mb-1">
                    Correct Answer:
                  </label>
                  <input
                    type="text"
                    value={q.correctAnswer}
                    onChange={(e) => updateQuestion(idx, 'correctAnswer', e.target.value)}
                    className="w-full p-2 bg-gray-600 border border-green-500 rounded text-white font-semibold"
                  />
                </div>

                {/* Options */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1">
                    All Options (including correct):
                  </label>
                  <div className="space-y-2">
                    {q.options?.map((opt, optIdx) => (
                      <div key={optIdx} className="flex gap-2 items-center">
                        <span className="text-gray-400 text-sm w-6">{optIdx + 1}.</span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                          className={`flex-grow p-2 bg-gray-600 border rounded text-white ${
                            opt === q.correctAnswer ? 'border-green-500' : 'border-gray-500'
                          }`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => {
                    if (confirm(`Delete question "${q.question}"?`)) {
                      deleteQuestion(idx);
                    }
                  }}
                  className="w-full mt-2 p-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition"
                >
                  Delete Question
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuestionsEditor;
