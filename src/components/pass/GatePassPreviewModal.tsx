'use client';

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Download,
  FileText,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Share2,
  Copy,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { GatePass, HostelInfo } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { GlowingButton } from '@/components/ui/GlowingButton';
import { PrintableGatePass } from './PrintableGatePass';
import { downloadGatePassPDF } from '@/lib/pdfGenerator';
import { downloadGatePassDocx } from '@/lib/docxGenerator';
import { DEFAULT_HOSTEL_INFO } from '@/lib/seedData';

interface GatePassPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pass: GatePass | null;
  hostelInfo?: HostelInfo;
}

export const GatePassPreviewModal: React.FC<GatePassPreviewModalProps> = ({
  isOpen,
  onClose,
  pass,
  hostelInfo = DEFAULT_HOSTEL_INFO,
}) => {
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!pass) return null;

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#34d399', '#38bdf8', '#fbbf24'],
    });
  };

  const handleDownloadPDF = () => {
    setDownloadingPdf(true);
    try {
      downloadGatePassPDF(pass, hostelInfo);
      triggerConfetti();
    } catch (e) {
      console.error('PDF Download Error:', e);
      alert('Failed to generate PDF. Please try printing directly.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDownloadDocx = async () => {
    setDownloadingDocx(true);
    try {
      await downloadGatePassDocx(pass, hostelInfo);
      triggerConfetti();
    } catch (e) {
      console.error('DOCX Download Error:', e);
      alert('Failed to generate Word document.');
    } finally {
      setDownloadingDocx(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopySummary = () => {
    const text = `VSB BOYS HOSTEL-I GATE PASS\nPass No: ${pass.passNumber}\nDate: ${pass.formattedDate}\nTotal Students: ${pass.studentCount}\nRooms: ${pass.roomsIncluded.join(', ')}\nPurpose: ${pass.purpose || 'General'}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Official Gate Pass Preview & Export"
      subtitle={`Generated Pass #${pass.passNumber} • ${pass.studentCount} Students Selected`}
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Top Quick Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-[#063b31] to-[#042d25] border border-emerald-500/30">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-bold text-white">
              Gate Pass Ready for Print / Export
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <GlowingButton
              variant="accent"
              size="sm"
              icon={Printer}
              onClick={handlePrint}
            >
              Print A4
            </GlowingButton>

            <GlowingButton
              variant="primary"
              size="sm"
              icon={Download}
              loading={downloadingPdf}
              onClick={handleDownloadPDF}
            >
              Download PDF
            </GlowingButton>

            <GlowingButton
              variant="secondary"
              size="sm"
              icon={FileText}
              loading={downloadingDocx}
              onClick={handleDownloadDocx}
            >
              Download Word (.docx)
            </GlowingButton>

            <button
              onClick={handleCopySummary}
              className="p-2 rounded-xl bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 hover:text-white transition-colors text-xs font-semibold flex items-center space-x-1.5"
              title="Copy Summary to Clipboard"
            >
              <Copy className="w-4 h-4" />
              <span>{copied ? 'Copied!' : 'Copy Info'}</span>
            </button>
          </div>
        </div>

        {/* Notice regarding standard college format */}
        <div className="px-4 py-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/20 text-xs text-emerald-200/90 flex items-center space-x-2">
          <span className="font-bold text-emerald-400">Formal A4 Notice:</span>
          <span>
            This printable document uses the official college format with blank signature columns for physical student signatures and assistant/deputy warden approval.
          </span>
        </div>

        {/* Live A4 Document Preview */}
        <div className="bg-gray-200/90 dark:bg-black/40 p-4 sm:p-8 rounded-2xl border border-emerald-500/20 overflow-x-auto max-h-[55vh] overflow-y-auto">
          <PrintableGatePass pass={pass} hostelInfo={hostelInfo} />
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-gray-300 hover:text-white hover:bg-emerald-900/40 border border-emerald-500/20 transition-colors"
          >
            Close Preview
          </button>
          <GlowingButton
            variant="primary"
            size="md"
            icon={Download}
            onClick={handleDownloadPDF}
          >
            Save & Download PDF
          </GlowingButton>
        </div>
      </div>
    </Modal>
  );
};
