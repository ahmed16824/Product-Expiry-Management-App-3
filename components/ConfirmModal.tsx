import React, { ReactNode } from 'react';
import Modal from './Modal';
import { useSettings } from '../context/SettingsContext';
import { useSound } from '../context/SoundContext';
import { ExclamationTriangleIcon } from './Icons';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  children: ReactNode;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ isOpen, onClose, onConfirm, title, children }) => {
  const { t, direction } = useSettings();
  const { playSound } = useSound();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="sm:flex sm:items-start">
        <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 sm:mx-0 sm:h-10 sm:w-10 ${direction === 'rtl' ? 'sm:ml-4' : 'sm:mr-4'}`}>
          <ExclamationTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
        </div>
        <div className={`mt-3 text-center sm:mt-0 ${direction === 'rtl' ? 'sm:text-right' : 'sm:text-left'}`}>
          <div className="mt-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {children}
            </p>
          </div>
        </div>
      </div>
      <div className={`mt-5 sm:mt-4 flex flex-col-reverse sm:flex-row gap-2 ${direction === 'rtl' ? 'sm:justify-start' : 'sm:justify-end'}`}>
        <button
          type="button"
          className="w-full inline-flex justify-center rounded-md border border-slate-300 dark:border-slate-500 shadow-sm px-4 py-2 bg-white dark:bg-slate-700 text-base font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none sm:w-auto sm:text-sm"
          onClick={() => {
              playSound('click');
              onClose();
          }}
        >
          {t('cancel')}
        </button>
        <button
          type="button"
          className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none sm:w-auto sm:text-sm"
          onClick={() => {
              playSound('click');
              onConfirm();
          }}
        >
          {t('delete')}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmModal;