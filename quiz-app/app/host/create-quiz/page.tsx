"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, ImageIcon, VideoIcon, ArrowLeftIcon } from "lucide-react"
import { useRouter } from "next/navigation"

interface Question {
  id: string
  type: "multiple-choice" | "true-false" | "short-answer"
  question: string
  options?: string[]
  correctAnswer: string | number
  timeLimit: number
  points: number
  category?: string
  media?: {
    type: "image" | "video"
    url: string
  }
}

export default function CreateQuiz() {
  const router = useRouter()
  const [quizTitle, setQuizTitle] = useState("")
  const [quizDescription, setQuizDescription] = useState("")
  const [negativeMarking, setNegativeMarking] = useState(false)
  const [teamMode, setTeamMode] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: "1",
      type: "multiple-choice",
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      timeLimit: 30,
      points: 100,
      category: "General",
    },
  ])

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      type: "multiple-choice",
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      timeLimit: 30,
      points: 100,
      category: "General",
    }
    setQuestions([...questions, newQuestion])
  }

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id))
  }

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)))
  }

  const handleSaveQuiz = async () => {
    // TODO: Replace with actual user ID from auth/session
    const userId = 1; // Change this to the logged-in user's ID
    try {
      const formattedQuestions = questions.map((q) => {
        let formattedCorrectAnswer: string | boolean;
        if (q.type === "multiple-choice") {
          // Use the string value of the selected option
          formattedCorrectAnswer = (q.options && typeof q.correctAnswer === "number") ? q.options[q.correctAnswer] : "";
        } else if (q.type === "true-false") {
          // Convert string 'true'/'false' to boolean
          formattedCorrectAnswer = q.correctAnswer === "true";
        } else {
          // Short answer: use as string
          formattedCorrectAnswer = String(q.correctAnswer ?? "");
        }
        return {
          ...q,
          type:
            q.type === "multiple-choice"
              ? "multiple_choice"
              : q.type === "true-false"
              ? "true_false"
              : "short_answer",
          correctAnswer: formattedCorrectAnswer,
        };
      });
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quizTitle,
          description: quizDescription,
          negative_marking: negativeMarking,
          team_mode: teamMode,
          questions: formattedQuestions,
          userId,
        }),
      });
      if (!res.ok) throw new Error('Failed to create quiz');
      router.push('/host/dashboard');
    } catch (err) {
      alert('Error creating quiz.');
    }
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-glow">Create New Quiz</h1>
            <p className="mt-2 text-balance">
              Design your quiz with multiple question types and advanced settings
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quiz Settings */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle>Quiz Settings</CardTitle>
                <CardDescription>Configure your quiz parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Quiz Title</Label>
                  <Input
                    id="title"
                    value={quizTitle}
                    onChange={(e) => setQuizTitle(e.target.value)}
                    placeholder="Enter quiz title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={quizDescription}
                    onChange={(e) => setQuizDescription(e.target.value)}
                    placeholder="Brief description of your quiz"
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="negative-marking">Negative Marking</Label>
                  <Switch id="negative-marking" checked={negativeMarking} onCheckedChange={setNegativeMarking} />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="team-mode">Team Mode</Label>
                  <Switch id="team-mode" checked={teamMode} onCheckedChange={setTeamMode} />
                </div>

                <div className="pt-4 border-t">
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p>Total Questions: {questions.length}</p>
                    <p>
                      Estimated Duration: {Math.ceil(questions.reduce((sum, q) => sum + q.timeLimit, 0) / 60)} minutes
                    </p>
                    <p>Total Points: {questions.reduce((sum, q) => sum + q.points, 0)}</p>
                  </div>
                </div>

                <Button onClick={handleSaveQuiz} className="w-full" size="lg">
                  Save Quiz
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Questions */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {questions.map((question, index) => (
                <Card key={question.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon">
                          <ImageIcon className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <VideoIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeQuestion(question.id)}
                          disabled={questions.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Question Type</Label>
                        <Select
                          value={question.type}
                          onValueChange={(value: any) => updateQuestion(question.id, { type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                            <SelectItem value="true-false">True/False</SelectItem>
                            <SelectItem value="short-answer">Short Answer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select
                          value={question.category}
                          onValueChange={(value) => updateQuestion(question.id, { category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="General">General</SelectItem>
                            <SelectItem value="Science">Science</SelectItem>
                            <SelectItem value="History">History</SelectItem>
                            <SelectItem value="Sports">Sports</SelectItem>
                            <SelectItem value="Technology">Technology</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Question</Label>
                      <Textarea
                        value={question.question}
                        onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                        placeholder="Enter your question here"
                        rows={2}
                      />
                    </div>

                    {question.type === "multiple-choice" && (
                      <div className="space-y-3">
                        <Label>Answer Options</Label>
                        {question.options?.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center gap-3">
                            <input
                              type="radio"
                              name={`correct-${question.id}`}
                              checked={question.correctAnswer === optionIndex}
                              onChange={() => updateQuestion(question.id, { correctAnswer: optionIndex })}
                              className="w-4 h-4"
                            />
                            <Input
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...(question.options || [])]
                                newOptions[optionIndex] = e.target.value
                                updateQuestion(question.id, { options: newOptions })
                              }}
                              placeholder={`Option ${optionIndex + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {question.type === "true-false" && (
                      <div className="space-y-3">
                        <Label>Correct Answer</Label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`tf-${question.id}`}
                              checked={question.correctAnswer === "true"}
                              onChange={() => updateQuestion(question.id, { correctAnswer: "true" })}
                            />
                            True
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`tf-${question.id}`}
                              checked={question.correctAnswer === "false"}
                              onChange={() => updateQuestion(question.id, { correctAnswer: "false" })}
                            />
                            False
                          </label>
                        </div>
                      </div>
                    )}

                    {question.type === "short-answer" && (
                      <div className="space-y-2">
                        <Label>Correct Answer</Label>
                        <Input
                          value={question.correctAnswer as string}
                          onChange={(e) => updateQuestion(question.id, { correctAnswer: e.target.value })}
                          placeholder="Enter the correct answer"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Time Limit (seconds)</Label>
                        <Select
                          value={question.timeLimit.toString()}
                          onValueChange={(value) => updateQuestion(question.id, { timeLimit: Number.parseInt(value) })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 seconds</SelectItem>
                            <SelectItem value="30">30 seconds</SelectItem>
                            <SelectItem value="45">45 seconds</SelectItem>
                            <SelectItem value="60">60 seconds</SelectItem>
                            <SelectItem value="90">90 seconds</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Points</Label>
                        <Input
                          type="number"
                          value={question.points}
                          onChange={(e) =>
                            updateQuestion(question.id, { points: Number.parseInt(e.target.value) || 100 })
                          }
                          min="50"
                          max="1000"
                          step="50"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button onClick={addQuestion} variant="outline" className="w-full bg-transparent" size="lg">
                <Plus className="w-5 h-5 mr-2" />
                Add Question
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
