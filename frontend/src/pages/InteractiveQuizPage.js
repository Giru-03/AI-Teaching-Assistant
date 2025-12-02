import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

export default function InteractiveQuizPage() {
  const [topic, setTopic] = useState('');
  const [quiz, setQuiz] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleStartQuiz = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setMessages([]);
    try {
      const { data } = await axios.post(`${API_BASE}/api/generate-quiz`, {
        topic,
        gradeLevel: '8', // You can make this a user input
        reference: `General knowledge about ${topic}`,
      });

      if (!data.quiz || data.quiz.length === 0) {
        setMessages([{ sender: 'ai', text: 'Sorry, I couldn\'t create a quiz for that topic. Please try another one.' }]);
        return;
      }
      
      setQuiz(data.quiz);
      setMessages([{ sender: 'ai', text: `Great! I've created a quiz on "${topic}".\n\nHere is your first question:` }]);
      setCurrentQuestionIndex(0);
      setQuizStarted(true);

    } catch (error) {
      console.error('Failed to generate quiz', error);
      setMessages([{ sender: 'ai', text: 'Sorry, an error occurred. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || loading) return;

    const newMessages = [...messages, { sender: 'user', text: userInput }];
    setMessages(newMessages);
    setUserInput('');
    setLoading(true);

    try {
      const questionData = quiz[currentQuestionIndex];
      const { data } = await axios.post(`${API_BASE}/api/evaluate-answer`, {
        questionData,
        userAnswer: userInput,
      });
      
      const updatedMessages = [...newMessages, { sender: 'ai', text: data.feedback }];

      if (data.isCorrect) {
        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex < quiz.length) {
          // Ask the next question
          const nextQuestion = quiz[nextIndex];
          const optionsText = nextQuestion.options.map(opt => `• ${opt}`).join('\n');
          const questionText = `Correct! Here's the next one:\n\n${nextQuestion.question}\n\n${optionsText}`;
          setMessages([...updatedMessages, { sender: 'ai', text: questionText }]);
          setCurrentQuestionIndex(nextIndex);
        } else {
          // End of the quiz
          setMessages([...updatedMessages, { sender: 'ai', text: '🎉 Congratulations! You have completed the quiz. Excellent work!' }]);
          setQuizStarted(false);
        }
      } else {
        setMessages(updatedMessages); // Just show the hint
      }
    } catch (error) {
      console.error('Failed to evaluate answer', error);
      setMessages(prev => [...prev, { sender: 'ai', text: 'I had a little trouble processing that. Let\'s try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (quizStarted && quiz.length > 0 && messages.length === 1) {
      const currentQuestion = quiz[currentQuestionIndex];
      const optionsText = currentQuestion.options.map(opt => `• ${opt}`).join('\n');
      const questionText = `${currentQuestion.question}\n\n${optionsText}`;
      setMessages(prev => [...prev, { sender: 'ai', text: questionText }]);
    }
  }, [quizStarted, quiz, messages, currentQuestionIndex]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
      <div className="w-full max-w-2xl bg-white shadow-md rounded-lg flex flex-col h-[90vh]">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-blue-700 text-center">🤖 AI Quiz Tutor</h1>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <p className={`p-3 rounded-lg max-w-xs lg:max-w-md whitespace-pre-wrap ${msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'}`}>
                {msg.text}
              </p>
            </div>
          ))}
          {loading && !quizStarted && <p className="text-center text-gray-500">Generating your quiz...</p>}
          <div ref={chatEndRef} />
        </div>

        <div className="p-4 border-t bg-gray-50">
          {quizStarted ? (
            <form onSubmit={handleSubmitAnswer} className="flex gap-2">
              <input type="text" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Type your answer..." className="flex-1 p-2 border rounded-md" disabled={loading} />
              <button type="submit" className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50" disabled={loading}>
                {loading ? 'Thinking...' : 'Send'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleStartQuiz} className="flex gap-2">
              <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Enter a quiz topic to begin..." className="flex-1 p-2 border rounded-md" disabled={loading} />
              <button type="submit" className="bg-green-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50" disabled={loading}>
                {loading ? 'Starting...' : 'Start Quiz'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}