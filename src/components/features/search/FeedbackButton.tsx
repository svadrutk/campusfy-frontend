import { motion } from "framer-motion";
import { MessageSquare } from "lucide-react";

export default function FeedbackButton() {
  return (
    <motion.a
      href="https://docs.google.com/forms/d/e/1FAIpQLSc4M-RLBCPvWya_2Ur8coxk-dioYDQ6JkcwpFi9euC4ksTEhw/viewform?usp=header"
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      className="w-full flex items-center justify-center gap-2 p-3 bg-white border border-[var(--color-primary)] text-[var(--color-primary-text)] rounded-full hover:bg-[var(--color-primary-light)] transition-colors shadow-sm cursor-pointer"
    >
      <MessageSquare size={16} />
      <span>leave us feedback!</span>
    </motion.a>
  );
} 