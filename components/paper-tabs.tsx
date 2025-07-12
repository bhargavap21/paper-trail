"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { X } from "lucide-react"

interface Paper {
  id: string
  title: string
}

interface PaperTabsProps {
  papers: Paper[]
  activePaperId: string
  onTabChange: (id: string) => void
  onTabClose: (id: string) => void
}

export function PaperTabs({ papers, activePaperId, onTabChange, onTabClose }: PaperTabsProps) {
  return (
    <div className="border-b bg-gray-50">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex w-max space-x-0">
          {papers.map((paper) => (
            <div
              key={paper.id}
              className={`flex items-center px-4 py-2 border-r border-b-2 min-w-[180px] max-w-[240px] font-sans ${
                paper.id === activePaperId
                  ? "border-b-royal-500 bg-white"
                  : "border-b-transparent hover:bg-gray-100"
              }`}
            >
              <button 
                className={`flex-1 text-sm font-medium truncate text-left ${paper.id === activePaperId ? 'text-royal-700' : 'text-gray-700'}`}
                onClick={() => onTabChange(paper.id)}
              >
                {paper.title}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 rounded-full opacity-50 hover:opacity-100 hover:bg-gray-200 ml-2"
                onClick={(e) => {
                  e.stopPropagation()
                  onTabClose(paper.id)
                }}
              >
                <X className="h-3 w-3 text-gray-500" />
              </Button>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
