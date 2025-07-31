"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, ArrowLeft, Save, Loader2 } from "lucide-react"
import { useRouter, useParams } from "next/navigation"
import { toast } from "@/components/ui/use-toast"

interface Question {
  id: string
  type: "multiple-choice" | "true-false" | "short-answer"
  question: string
  options?: string[]
  correctAnswer: string | number
  timeLimit: number
  points: number
  category?: string
}

interface Quiz {
  id: string
  title: string
  description: string
  questions: Question[]
  negativeMarking: boolean
  teamMode: boolean
}

export default function EditQuiz() {
  const router = useRouter()
  const params = useParams()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [quizTitle, setQuizTitle] = useState("")
  const [quizDescription, setQuizDescription] = useState("")
  const [negativeMarking, setNegativeMarking] = useState(false)
  const [teamMode, setTeamMode] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])

  useEffect(() => {
    async function fetchQuiz() {
      try {
        const response = await fetch(`/api/quizzes/${params.id}`)
        if (!response.ok) {
          throw new Error('Failed to fetch quiz')
        }
        const data = await response.json()
        
        console.log('Fetched quiz data:', data)
        
        setQuiz(data)
        setQuizTitle(data.title || "")
        setQuizDescription(data.description || "")
        setNegativeMarking(data.negative_marking || false)
        setTeamMode(data.team_mode || false)
        
        // Transform questions from database format to UI format
        const transformedQuestions = (data.questions || []).map((q: any) => {
          let correctAnswer: string | number = q.correct_answer || '';
          
          // For multiple choice, find the correct option index
          if (q.type === 'multiple_choice' && q.options && q.options.length > 0) {
            const correctOptionIndex = q.options.findIndex((opt: any) => opt.option_text === q.correct_answer);
            correctAnswer = correctOptionIndex >= 0 ? correctOptionIndex : 0;
          }
          // For true/false, handle boolean values properly
          else if (q.type === 'true_false') {
            // Handle various boolean representations
            if (q.correct_answer === true || q.correct_answer === 'true' || q.correct_answer === '1') {
              correctAnswer = 'true';
            } else if (q.correct_answer === false || q.correct_answer === 'false' || q.correct_answer === '0') {
              correctAnswer = 'false';
            } else {
              // Default to false if unclear
              correctAnswer = 'false';
            }
          }
          // For short answer, ensure it's a string
          else if (q.type === 'short_answer') {
            correctAnswer = String(q.correct_answer || '');
          }
          
          const transformedQuestion = {
            id: q.id.toString(), // Preserve the original database ID
            type: q.type === 'multiple_choice' ? 'multiple-choice' : 
                  q.type === 'true_false' ? 'true-false' : 'short-answer',
            question: q.question || '',
            options: q.options?.map((opt: any) => opt.option_text || '').filter((opt: string) => opt.trim() !== '') || [],
            correctAnswer: correctAnswer,
            timeLimit: q.time_limit || 30,
            points: q.points || 100,
            category: q.category || "General",
          }
          
          console.log('Transformed question:', transformedQuestion)
          return transformedQuestion
        })
        
        console.log('Setting questions:', transformedQuestions)
        setQuestions(transformedQuestions)
      } catch (error) {
        console.error('Error fetching quiz:', error)
        toast({
          title: "Error",
          description: "Failed to load quiz. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchQuiz()
    }
  }, [params.id])

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saving) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [saving])

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)))
    setHasUnsavedChanges(true)
  }

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
    setHasUnsavedChanges(true)
  }

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id))
    setHasUnsavedChanges(true)
  }

  const handleSaveQuiz = async () => {
    if (!quizTitle.trim()) {
      toast({
        title: "Error",
        description: "Quiz title is required.",
        variant: "destructive",
      })
      return
    }

    if (questions.length === 0) {
      toast({
        title: "Error",
        description: "At least one question is required.",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      console.log('Current questions before formatting:', questions)
      
      const formattedQuestions = questions.map((q) => {
        let formattedCorrectAnswer: string | boolean;
        
        if (q.type === "multiple-choice") {
          // For multiple choice, use the option text as correct answer
          if (q.options && typeof q.correctAnswer === "number" && q.options[q.correctAnswer]) {
            formattedCorrectAnswer = q.options[q.correctAnswer];
          } else if (typeof q.correctAnswer === "string") {
            formattedCorrectAnswer = q.correctAnswer;
          } else {
            formattedCorrectAnswer = "";
          }
        } else if (q.type === "true-false") {
          // For true/false, ensure it's a boolean
          formattedCorrectAnswer = q.correctAnswer === "true" || q.correctAnswer === true;
        } else {
          // For short answer, ensure it's a string
          formattedCorrectAnswer = String(q.correctAnswer ?? "");
        }
        
        return {
          id: q.id, // Include the question ID for backend processing
          type:
            q.type === "multiple-choice"
              ? "multiple_choice"
              : q.type === "true-false"
              ? "true_false"
              : "short_answer",
          question: q.question,
          correctAnswer: formattedCorrectAnswer,
          timeLimit: q.timeLimit,
          points: q.points,
          category: q.category,
          options: q.options,
        };
      });

      console.log('Formatted questions:', formattedQuestions)

      const requestBody = {
        title: quizTitle,
        description: quizDescription,
        questions: formattedQuestions,
        negativeMarking,
        teamMode,
      }
      
      console.log('Sending request body:', requestBody)

      const response = await fetch(`/api/quizzes/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      console.log('Response status:', response.status)
      console.log('Response headers:', Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('API Error:', errorData)
        throw new Error(`Failed to update quiz: ${response.status} ${errorData.error || response.statusText}`)
      }

      const result = await response.json()
      console.log('Update successful:', result)

      setHasUnsavedChanges(false)
      toast({
        title: "Success",
        description: "Quiz updated successfully!",
      })

      router.push("/host/dashboard")
    } catch (error) {
      console.error('Error updating quiz:', error)
      toast({
        title: "Error",
        description: "Failed to update quiz. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Quiz Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">The quiz you're looking for doesn't exist.</p>
          <Button onClick={() => router.push("/host/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => {
                if (hasUnsavedChanges) {
                  if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
                    router.back()
                  }
                } else {
                  router.back()
                }
              }} 
              className="transition-element"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Quiz</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Modify your quiz settings and questions
                {hasUnsavedChanges && (
                  <span className="ml-2 text-orange-600 dark:text-orange-400 text-sm">
                    (Unsaved changes)
                  </span>
                )}
              </p>
            </div>
          </div>
          <Button 
            onClick={handleSaveQuiz} 
            disabled={saving || !hasUnsavedChanges} 
            className="transition-element"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quiz Settings */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Quiz Settings</CardTitle>
                <CardDescription>Configure your quiz preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Quiz Title</Label>
                  <Input
                    id="title"
                    value={quizTitle}
                    onChange={(e) => {
                      setQuizTitle(e.target.value)
                      setHasUnsavedChanges(true)
                    }}
                    placeholder="Enter quiz title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={quizDescription}
                    onChange={(e) => {
                      setQuizDescription(e.target.value)
                      setHasUnsavedChanges(true)
                    }}
                    placeholder="Enter quiz description"
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Negative Marking</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Deduct points for incorrect answers
                    </p>
                  </div>
                  <Switch
                    checked={negativeMarking}
                    onCheckedChange={(checked) => {
                      setNegativeMarking(checked)
                      setHasUnsavedChanges(true)
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Team Mode</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Allow participants to join as teams
                    </p>
                  </div>
                  <Switch
                    checked={teamMode}
                    onCheckedChange={(checked) => {
                      setTeamMode(checked)
                      setHasUnsavedChanges(true)
                    }}
                  />
                </div>

                <div className="pt-4 border-t">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p><strong>Total Questions:</strong> {questions.length}</p>
                    <p><strong>Total Points:</strong> {questions.reduce((sum, q) => sum + q.points, 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Questions */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Questions</h2>
              <Button onClick={addQuestion} className="transition-element">
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </div>

            {questions.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">No questions yet</p>
                  <Button onClick={addQuestion} className="transition-element">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Question
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {questions.map((question, index) => (
                  <Card key={question.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeQuestion(question.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Question Type</Label>
                          <Select
                            value={question.type}
                            onValueChange={(value: "multiple-choice" | "true-false" | "short-answer") =>
                              updateQuestion(question.id, { type: value })
                            }
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
                          <Label>Time Limit (seconds)</Label>
                          <Input
                            type="number"
                            value={question.timeLimit}
                            onChange={(e) =>
                              updateQuestion(question.id, { timeLimit: parseInt(e.target.value) || 30 })
                            }
                            min="5"
                            max="300"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Question Text</Label>
                        <Textarea
                          value={question.question}
                          onChange={(e) =>
                            updateQuestion(question.id, { question: e.target.value })
                          }
                          placeholder="Enter your question"
                          rows={3}
                        />
                      </div>

                      {question.type === "multiple-choice" && (
                        <div className="space-y-4">
                          <Label>Options</Label>
                          {question.options?.map((option, optionIndex) => (
                            <div key={optionIndex} className="flex items-center gap-2">
                              <Input
                                value={option}
                                onChange={(e) => {
                                  const newOptions = [...(question.options || [])]
                                  newOptions[optionIndex] = e.target.value
                                  updateQuestion(question.id, { options: newOptions })
                                }}
                                placeholder={`Option ${optionIndex + 1}`}
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  updateQuestion(question.id, { correctAnswer: optionIndex })
                                }}
                                className={
                                  question.correctAnswer === optionIndex
                                    ? "bg-green-100 text-green-800 border-green-300"
                                    : ""
                                }
                              >
                                Correct
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {question.type === "true-false" && (
                        <div className="space-y-2">
                          <Label>Correct Answer</Label>
                          <Select
                            value={String(question.correctAnswer)}
                            onValueChange={(value) =>
                              updateQuestion(question.id, { correctAnswer: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">True</SelectItem>
                              <SelectItem value="false">False</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {question.type === "short-answer" && (
                        <div className="space-y-2">
                          <Label>Correct Answer</Label>
                          <Input
                            value={String(question.correctAnswer)}
                            onChange={(e) =>
                              updateQuestion(question.id, { correctAnswer: e.target.value })
                            }
                            placeholder="Enter the correct answer"
                          />
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Points</Label>
                        <Input
                          type="number"
                          value={question.points}
                          onChange={(e) =>
                            updateQuestion(question.id, { points: parseInt(e.target.value) || 100 })
                          }
                          min="1"
                          max="1000"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}