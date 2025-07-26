import { useState } from "react"
import { useKV } from "@github/spark/hooks"
import { AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { ExpenseCard } from "./components/ExpenseCard"
import { ExpenseForm } from "./components/ExpenseForm"
import { SummaryDashboard } from "./components/SummaryDashboard"
import { FloatingActionButton } from "./components/FloatingActionButton"
import { Toaster } from "@/components/ui/sonner"

interface Expense {
  id: string
  amount: number
  category: string
  note?: string
  date: string
}

function App() {
  const [expenses, setExpenses] = useKV<Expense[]>("expenses", [])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day')

  const handleSaveExpense = (expenseData: Omit<Expense, 'id'>) => {
    if (editingExpense) {
      setExpenses(currentExpenses => 
        currentExpenses.map(expense => 
          expense.id === editingExpense.id 
            ? { ...expenseData, id: editingExpense.id }
            : expense
        )
      )
      toast.success("支出已更新")
      setEditingExpense(null)
    } else {
      const newExpense: Expense = {
        ...expenseData,
        id: Date.now().toString()
      }
      setExpenses(currentExpenses => [newExpense, ...currentExpenses])
      toast.success("支出已添加")
    }
  }

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setIsFormOpen(true)
  }

  const handleDeleteExpense = (id: string) => {
    setExpenses(currentExpenses => 
      currentExpenses.filter(expense => expense.id !== id)
    )
    toast.success("支出已删除")
  }

  const handleOpenForm = () => {
    setEditingExpense(null)
    setIsFormOpen(true)
  }

  const sortedExpenses = [...expenses].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm z-40 border-b border-border/50">
          <div className="px-4 py-6">
            <h1 className="text-2xl font-bold text-foreground">记账</h1>
            <p className="text-sm text-muted-foreground">简单记录每一笔支出</p>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 pb-24">
          {/* Summary Dashboard */}
          <div className="py-4">
            <SummaryDashboard 
              expenses={expenses}
              selectedPeriod={selectedPeriod}
              onPeriodChange={setSelectedPeriod}
            />
          </div>

          {/* Recent Expenses */}
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              最近支出
            </h2>
            
            {sortedExpenses.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">💸</div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  还没有支出记录
                </h3>
                <p className="text-sm text-muted-foreground mb-6">
                  点击右下角的 + 按钮添加第一笔支出
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {sortedExpenses.map((expense) => (
                  <ExpenseCard
                    key={expense.id}
                    expense={expense}
                    onEdit={handleEditExpense}
                    onDelete={handleDeleteExpense}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Floating Action Button */}
        <FloatingActionButton onClick={handleOpenForm} />

        {/* Expense Form */}
        <ExpenseForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false)
            setEditingExpense(null)
          }}
          onSave={handleSaveExpense}
          editingExpense={editingExpense}
        />

        {/* Toast Notifications */}
        <Toaster />
      </div>
    </div>
  )
}

export default App