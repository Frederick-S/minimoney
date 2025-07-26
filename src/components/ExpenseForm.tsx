import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Plus, Check } from "@phosphor-icons/react"
import { motion } from "framer-motion"

interface Expense {
  id: string
  amount: number
  category: string
  note?: string
  date: string
}

interface ExpenseFormProps {
  isOpen: boolean
  onClose: () => void
  onSave: (expense: Omit<Expense, 'id'>) => void
  editingExpense?: Expense | null
}

const categories = [
  { name: "餐饮", value: "Food" },
  { name: "交通", value: "Transport" },
  { name: "购物", value: "Shopping" },
  { name: "娱乐", value: "Entertainment" },
  { name: "医疗", value: "Health" },
  { name: "账单", value: "Bills" },
  { name: "其他", value: "Other" }
]

const categoryColors = {
  Food: "bg-red-100 text-red-800 hover:bg-red-200",
  Transport: "bg-blue-100 text-blue-800 hover:bg-blue-200", 
  Shopping: "bg-purple-100 text-purple-800 hover:bg-purple-200",
  Entertainment: "bg-green-100 text-green-800 hover:bg-green-200",
  Health: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  Bills: "bg-gray-100 text-gray-800 hover:bg-gray-200",
  Other: "bg-slate-100 text-slate-800 hover:bg-slate-200"
}

export function ExpenseForm({ isOpen, onClose, onSave, editingExpense }: ExpenseFormProps) {
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [note, setNote] = useState("")

  useEffect(() => {
    if (editingExpense) {
      setAmount(editingExpense.amount.toString())
      setCategory(editingExpense.category)
      setNote(editingExpense.note || "")
    } else {
      setAmount("")
      setCategory("")
      setNote("")
    }
  }, [editingExpense, isOpen])

  const handleSave = () => {
    if (!amount || !category) return

    const expenseData = {
      amount: parseFloat(amount),
      category,
      note: note.trim() || undefined,
      date: editingExpense?.date || new Date().toISOString()
    }

    onSave(expenseData)
    setAmount("")
    setCategory("")
    setNote("")
    onClose()
  }

  const handleAmountChange = (value: string) => {
    // Only allow numbers and one decimal point
    const sanitized = value.replace(/[^\d.]/g, '')
    const parts = sanitized.split('.')
    if (parts.length > 2) return
    if (parts[1] && parts[1].length > 2) return
    setAmount(sanitized)
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="pb-6">
          <SheetTitle className="text-xl font-semibold">
            {editingExpense ? "编辑支出" : "添加支出"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-base font-medium">
              金额 *
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                ¥
              </span>
              <Input
                id="amount"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0.00"
                className="pl-8 text-lg h-12"
                inputMode="decimal"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium">分类 *</Label>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => (
                <motion.div
                  key={cat.value}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.1 }}
                >
                  <Button
                    variant="ghost"
                    onClick={() => setCategory(cat.value)}
                    className={`
                      h-12 w-full justify-center relative border-2 transition-all duration-200
                      ${category === cat.value 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                      }
                      ${categoryColors[cat.value as keyof typeof categoryColors]}
                    `}
                  >
                    {cat.name}
                    {category === cat.value && (
                      <Check size={16} className="absolute right-2 text-primary" />
                    )}
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note" className="text-base font-medium">
              备注
            </Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="可选备注..."
              className="min-h-20 resize-none"
            />
          </div>
        </div>

        <SheetFooter className="pt-6">
          <div className="grid grid-cols-2 gap-3 w-full">
            <Button variant="outline" onClick={onClose} className="h-12">
              取消
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!amount || !category}
              className="h-12"
            >
              {editingExpense ? "更新" : "保存"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}