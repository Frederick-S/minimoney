import { Button } from "@/components/ui/button"
import { Plus } from "@phosphor-icons/react"
import { motion } from "framer-motion"

interface FloatingActionButtonProps {
  onClick: () => void
}

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <motion.div
      className="fixed bottom-6 right-6 z-50"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <Button
        size="lg"
        onClick={onClick}
        className="
          h-14 w-14 rounded-full shadow-lg bg-accent hover:bg-accent/90 
          border-0 transition-all duration-200 hover:shadow-xl
        "
      >
        <Plus size={24} className="text-accent-foreground" />
      </Button>
    </motion.div>
  )
}