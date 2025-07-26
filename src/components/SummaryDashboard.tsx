import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"

interface Expense {
  id: string
  amount: number
  category: string
  note?: string
  date: string
}

interface SummaryDashboardProps {
  expenses: Expense[]
  selectedPeriod: 'day' | 'week' | 'month'
  onPeriodChange: (period: 'day' | 'week' | 'month') => void
}

export function SummaryDashboard({ expenses, selectedPeriod, onPeriodChange }: SummaryDashboardProps) {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY'
    }).format(amount)
  }

  const getFilteredExpenses = () => {
    const now = new Date()
    let startDate: Date

    switch (selectedPeriod) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now)
        startDate.setDate(now.getDate() - now.getDay())
        startDate.setHours(0, 0, 0, 0)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      default:
        startDate = new Date(0)
    }

    return expenses.filter(expense => new Date(expense.date) >= startDate)
  }

  const filteredExpenses = getFilteredExpenses()
  const total = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  
  const categoryTotals = filteredExpenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount
    return acc
  }, {} as Record<string, number>)

  const sortedCategories = Object.entries(categoryTotals)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)

  const categoryNames = {
    Food: "餐饮",
    Transport: "交通",
    Shopping: "购物",
    Entertainment: "娱乐",
    Health: "医疗",
    Bills: "账单",
    Other: "其他"
  }

  const periodLabels = {
    day: "今日",
    week: "本周", 
    month: "本月"
  }

  return (
    <Card className="p-6 mb-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
      <div className="space-y-4">
        <Tabs value={selectedPeriod} onValueChange={onPeriodChange as any} className="w-full">
          <TabsList className="grid grid-cols-3 w-full bg-background/50">
            <TabsTrigger value="day" className="text-sm">今日</TabsTrigger>
            <TabsTrigger value="week" className="text-sm">本周</TabsTrigger>
            <TabsTrigger value="month" className="text-sm">本月</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-1">
            {periodLabels[selectedPeriod]}支出
          </p>
          <p className="text-3xl font-bold text-foreground">
            {formatAmount(total)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            共 {filteredExpenses.length} 笔记录
          </p>
        </div>

        {sortedCategories.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">主要支出分类</p>
            <div className="flex flex-wrap gap-2">
              {sortedCategories.map(([category, amount]) => (
                <Badge 
                  key={category} 
                  variant="secondary" 
                  className="bg-background/70 text-foreground"
                >
                  {categoryNames[category as keyof typeof categoryNames]} {formatAmount(amount)}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}