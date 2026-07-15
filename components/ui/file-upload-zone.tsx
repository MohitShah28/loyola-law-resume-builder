"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, File, X, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface UploadedFile {
  id: string
  name: string
  type: string
  size: number
  uploadDate: string
}

interface FileUploadZoneProps {
  onFilesUploaded?: (files: File[]) => void
  accept?: string
  maxFiles?: number
  className?: string
}

export function FileUploadZone({ 
  onFilesUploaded, 
  accept = ".pdf,.md,.doc,.docx",
  maxFiles = 5,
  className 
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const uploadIntervalsRef = useRef<ReturnType<typeof setInterval>[]>([])

  useEffect(() => {
    return () => {
      uploadIntervalsRef.current.forEach(clearInterval)
      uploadIntervalsRef.current = []
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const simulateUpload = (file: File) => {
    const fileId = `${file.name}-${file.size}-${Date.now()}`
    let progress = 0
    setUploadProgress(prev => ({ ...prev, [fileId]: 0 }))

    const interval = setInterval(() => {
      progress = Math.min(progress + 10, 100)

      if (progress >= 100) {
        clearInterval(interval)
        uploadIntervalsRef.current = uploadIntervalsRef.current.filter((item) => item !== interval)
        setUploadedFiles(files => {
          const alreadyUploaded = files.some((uploadedFile) => (
            uploadedFile.name === file.name && uploadedFile.size === file.size
          ))
          if (alreadyUploaded) return files

          return [...files, {
            id: fileId,
            name: file.name,
            type: file.type || "application/octet-stream",
            size: file.size,
            uploadDate: new Date().toLocaleDateString()
          }]
        })
        setUploadProgress(prev => {
          const next = { ...prev }
          delete next[fileId]
          return next
        })
        return
      }

      setUploadProgress(prev => ({ ...prev, [fileId]: progress }))
    }, 100)

    uploadIntervalsRef.current.push(interval)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files).slice(0, maxFiles)
    files.forEach(simulateUpload)
    onFilesUploaded?.(files)
  }, [maxFiles, onFilesUploaded])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, maxFiles)
    files.forEach(simulateUpload)
    onFilesUploaded?.(files)
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(files => files.filter(f => f.id !== fileId))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / (1024 * 1024)).toFixed(1) + " MB"
  }

  return (
    <div className={cn("space-y-4", className)}>
      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        animate={{
          borderColor: isDragging ? "#4f46e5" : "#e2e8f0",
          backgroundColor: isDragging ? "rgba(79, 70, 229, 0.05)" : "transparent",
          scale: isDragging ? 1.02 : 1
        }}
        transition={{ duration: 0.2 }}
        className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer"
      >
        <input
          type="file"
          accept={accept}
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <motion.div
            animate={{ y: isDragging ? -5 : 0 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                Drop files here or click to upload
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                PDF, DOCX, or MD files (max {maxFiles} files)
              </p>
            </div>
          </motion.div>
        </label>
      </motion.div>

      {/* Upload Progress */}
      <AnimatePresence>
        {Object.entries(uploadProgress).map(([fileId, progress]) => (
          <motion.div
            key={fileId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-muted rounded-lg p-3"
          >
            <div className="flex items-center gap-3">
              <File className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium truncate">
                  {fileId.split("-")[0]}
                </p>
                <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
              </div>
              <span className="text-sm text-muted-foreground">{progress}%</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Uploaded Files */}
      <AnimatePresence>
        {uploadedFiles.map((file, index) => (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3 bg-card border border-border rounded-lg p-3"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <File className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {file.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(file.size)} • {file.uploadDate}
              </p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-[#10b981]" />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => removeFile(file.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
