import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Trash2, Edit } from "@phosphor-icons/react"
import { motion } from "framer-motion"

interface Expense {
  id: string
  amount: number
  category: string
  note?: string
  date: string
}

interface ExpenseCardProps {
  expense: Expense
  onEdit: (expense: Expense) => void
  onDelete: (id: string) => void
}

const categoryColors = {
  Food: "bg-red-100 text-red-800",
  Transport: "bg-blue-100 text-blue-800", 
  Shopping: "bg-purple-100 text-purple-800",
  Entertainment: "bg-green-100 text-green-800",
  Health: "bg-yellow-100 text-yellow-800",
  Bills: "bg-gray-100 text-gray-800",
  Other: "bg-slate-100 text-slate-800"
}

export function ExpenseCard({ expense, onEdit, onDelete }: ExpenseCardProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return "今天"
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "昨天"
    } else {
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="p-4 mb-3 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Badge 
                variant="secondary" 
                className={categoryColors[expense.category as keyof typeof categoryColors] || categoryColors.Other}
              >
                {expense.category}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {formatDate(expense.date)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-foreground">
                  {formatAmount(expense.amount)}
                </p>
                {expense.note && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {expense.note}
                  </p>
                )}
              </div>
              
              <div className="flex gap-2 ml-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(expense)}
                  className="h-8 w-8 p-0"
                >
                  <Edit size={16} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(expense.id)}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  )
}