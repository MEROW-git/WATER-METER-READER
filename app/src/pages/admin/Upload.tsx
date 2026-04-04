import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle,
  X,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Upload: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [listName, setListName] = useState('');
  const [sheetDate, setSheetDate] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    message: string;
    summary?: {
      totalRows: number;
      successfulRows: number;
      skippedRows: number;
      duplicateCount: number;
    };
  } | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isExcelFile(droppedFile)) {
      setFile(droppedFile);
      if (!listName) {
        setListName(droppedFile.name.replace(/\.[^/.]+$/, ''));
      }
    } else {
      toast({
        title: 'Invalid file',
        description: 'Please upload an Excel file (.xlsx or .xls)',
        variant: 'destructive',
      });
    }
  }, [listName, toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!listName) {
        setListName(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const isExcelFile = (file: File): boolean => {
    return (
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel' ||
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls')
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !sheetDate) return;

    setIsUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('listName', listName || file.name);
    if (sheetDate) {
      formData.append('sheetDate', sheetDate);
    }

    try {
      const response = await listsApi.upload(formData);
      setUploadResult({
        success: true,
        message: response.data.message,
        summary: response.data.summary,
      });
      toast({
        title: 'Success',
        description: 'Excel file uploaded successfully',
      });
      
      // Reset form
      setFile(null);
      setListName('');
      setSheetDate('');
    } catch (error: any) {
      setUploadResult({
        success: false,
        message: error.response?.data?.message || 'Failed to upload file',
      });
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to upload file',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setUploadResult(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Excel File</h1>
        <p className="text-muted-foreground">
          Import meter reading data from an Excel spreadsheet
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>File Upload</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Drag & Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center transition-colors
                  ${isDragging 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                  }
                  ${file ? 'bg-muted/50' : ''}
                `}
              >
                {file ? (
                  <div className="flex items-center justify-center gap-4">
                    <FileSpreadsheet className="h-10 w-10 text-green-600" />
                    <div className="text-left">
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={clearFile}
                      className="ml-4"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium mb-2">
                      Drag and drop your Excel file here
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      or click to browse
                    </p>
                    <Input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-input"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('file-input')?.click()}
                    >
                      Select File
                    </Button>
                  </>
                )}
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="listName">List Name</Label>
                  <Input
                    id="listName"
                    placeholder="Enter a name for this reading list"
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sheetDate">Sheet Date</Label>
                  <Input
                    id="sheetDate"
                    type="date"
                    value={sheetDate}
                    onChange={(e) => setSheetDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={!file || !sheetDate || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Upload and Import
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Instructions & Result */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Required Excel Columns</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {[
                  { name: 'meter_id', required: true, desc: 'Unique meter identifier' },
                  { name: 'customer', required: true, desc: 'Customer name' },
                  { name: 'Location ID', required: true, desc: 'Location identifier for assignment' },
                  { name: 'Name_ID', required: false, desc: 'Customer ID' },
                  { name: 'St', required: false, desc: 'Street address' },
                  { name: 'village', required: false, desc: 'Village/area name' },
                  { name: 'Date', required: false, desc: 'Reading date' },
                  { name: 'old_read', required: false, desc: 'Previous reading' },
                  { name: 'new_read', required: false, desc: 'Current reading (if empty, marked as pending)' },
                  { name: 'Text34', required: false, desc: 'Additional notes' },
                ].map((col) => (
                  <li key={col.name} className="flex items-start gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${col.required ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      {col.required ? 'Required' : 'Optional'}
                    </span>
                    <div>
                      <span className="font-medium">{col.name}</span>
                      <span className="text-sm text-muted-foreground"> - {col.desc}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {uploadResult && (
            <Alert variant={uploadResult.success ? 'default' : 'destructive'}>
              <div className="flex items-start gap-2">
                {uploadResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
                <div className="flex-1">
                  <AlertDescription className="font-medium">
                    {uploadResult.message}
                  </AlertDescription>
                  
                  {uploadResult.summary && (
                    <div className="mt-4 space-y-3">
                      <Progress 
                        value={(uploadResult.summary.successfulRows / uploadResult.summary.totalRows) * 100} 
                        className="h-2"
                      />
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Rows:</span>
                          <span className="font-medium">{uploadResult.summary.totalRows}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Successful:</span>
                          <span className="font-medium text-green-600">
                            {uploadResult.summary.successfulRows}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Skipped:</span>
                          <span className="font-medium text-orange-600">
                            {uploadResult.summary.skippedRows}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duplicates:</span>
                          <span className="font-medium text-red-600">
                            {uploadResult.summary.duplicateCount}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate('/lists')}
                        >
                          View Lists
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => navigate(`/lists`)}
                        >
                          Assign Records
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
};

export default Upload;
