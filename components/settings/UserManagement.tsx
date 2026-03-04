import React, { useState, useMemo } from 'react';
import { User, Role } from '../../types';
import { useSettings } from '../../context/SettingsContext';
import { useToaster } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { PlusIcon, PencilIcon, TrashIcon, UsersIcon } from '../Icons';
import Modal from '../Modal';
import ConfirmModal from '../ConfirmModal';

interface UserFormProps {
    onSave: (user: User) => void;
    onClose: () => void;
    userToEdit: User | null;
}

const UserForm: React.FC<UserFormProps> = ({ onSave, onClose, userToEdit }) => {
    const { t, direction } = useSettings();
    const [user, setUser] = useState<User>(() => {
        if (userToEdit) {
            if (!userToEdit.branchNames && (userToEdit as any).branchName) {
                return { ...userToEdit, branchNames: [(userToEdit as any).branchName] };
            }
            return { ...userToEdit, branchNames: userToEdit.branchNames || [] };
        }
        return { id: '', username: '', password_HACK: '', role: Role.Employee, organizationId: '', organizationName: '', branchNames: [] };
    });
    
    const handleAddBranch = () => {
        setUser(prev => ({ ...prev, branchNames: [...(prev.branchNames || []), ''] }));
    };

    const handleBranchChange = (index: number, value: string) => {
        setUser(prev => {
            const newBranches = [...(prev.branchNames || [])];
            newBranches[index] = value;
            return { ...prev, branchNames: newBranches };
        });
    };

    const handleRemoveBranch = (index: number) => {
        setUser(prev => {
            const newBranches = [...(prev.branchNames || [])];
            newBranches.splice(index, 1);
            return { ...prev, branchNames: newBranches };
        });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setUser(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (user.username && user.password_HACK) {
            const cleanedBranches = (user.branchNames || []).map(b => b.trim()).filter(b => b !== '');
            const userToSave = user.id ? { ...user, branchNames: cleanedBranches } : { ...user, id: `user_${Date.now()}`, branchNames: cleanedBranches };
            onSave(userToSave);
        }
    };

    const inputBaseClasses = "mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm";

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('username')}</label>
                <input type="text" name="username" id="username" value={user.username} onChange={handleChange} className={inputBaseClasses} required />
            </div>
             <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('password')}</label>
                <input type="password" name="password_HACK" id="password" value={user.password_HACK} onChange={handleChange} className={inputBaseClasses} required />
            </div>
            {user.role === Role.Employee && (
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t('branchNameLabel')}</label>
                    <div className="space-y-2">
                        {(user.branchNames || []).map((branch, index) => (
                            <div key={index} className="flex items-center gap-2">
                                <input 
                                    type="text" 
                                    value={branch} 
                                    onChange={(e) => handleBranchChange(index, e.target.value)} 
                                    className={inputBaseClasses} 
                                    placeholder={`${t('branchNameLabel')} ${index + 1}`} 
                                />
                                <button 
                                    type="button" 
                                    onClick={() => handleRemoveBranch(index)}
                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md mt-1"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                        <button 
                            type="button" 
                            onClick={handleAddBranch}
                            className="text-sm text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 flex items-center gap-1 mt-2"
                        >
                            <PlusIcon className="w-4 h-4" /> {t('addBranch') || 'Add Branch'}
                        </button>
                    </div>
                </div>
            )}
             <div>
                <label htmlFor="role" className="block text-sm font-medium text-slate-700 dark:text-slate-300">{t('role')}</label>
                <select name="role" id="role" value={user.role} onChange={handleChange} className={inputBaseClasses} required>
                    <option value="" disabled>{t('selectRole')}</option>
                    {Object.values(Role).map(roleValue => (
                        <option key={roleValue} value={roleValue}>{t(roleValue)}</option>
                    ))}
                </select>
            </div>
            <div className={`flex justify-end pt-4 space-x-2 ${direction === 'rtl' ? 'space-x-reverse' : ''}`}>
                <button type="button" onClick={onClose} className="bg-white dark:bg-slate-600 py-2 px-4 border border-slate-300 dark:border-slate-500 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">{t('cancel')}</button>
                <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500">{t('save')}</button>
            </div>
        </form>
    );
};

interface UserManagementProps {
    users: User[];
    onSaveUser: (user: User) => void;
    onDeleteUser: (userId: string) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, onSaveUser, onDeleteUser }) => {
    const { t } = useSettings();
    const { addToast } = useToaster();
    const { currentUser } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [confirmDeleteState, setConfirmDeleteState] = useState<{ isOpen: boolean; userId: string } | null>(null);

    const handleAddUser = () => {
        setUserToEdit(null);
        setIsModalOpen(true);
    };

    const handleEditUser = (user: User) => {
        setUserToEdit(user);
        setIsModalOpen(true);
    };
    
    const handleDeleteClick = (userId: string) => {
        setConfirmDeleteState({ isOpen: true, userId });
    };

    const confirmDelete = () => {
        if (confirmDeleteState) {
            onDeleteUser(confirmDeleteState.userId);
            setConfirmDeleteState(null);
            addToast(t('userDeleted'), 'success');
        }
    };


    const handleSave = (user: User) => {
        onSaveUser(user);
        setIsModalOpen(false);
        addToast(t('userSaved'), 'success');
    };

    const sortedUsers = useMemo(() => {
        return [...users].sort((a, b) => a.username.localeCompare(b.username));
    }, [users]);
    
    const roleStyles: Record<Role, string> = {
        [Role.Manager]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        [Role.Employee]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    };

    return (
        <>
            <div className="p-6 bg-white dark:bg-slate-800 rounded-lg shadow">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div>
                        <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{t('userManagement')}</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-1">{t('userManagementDesc')}</p>
                    </div>
                    <button onClick={handleAddUser} className="flex items-center justify-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-sky-700 transition-all active:scale-95">
                        <PlusIcon /> {t('addUser')}
                    </button>
                </div>
                
                <div className="mt-6 border-t dark:border-slate-700 -mx-6">
                    {sortedUsers.length > 0 ? (
                        <div className="divide-y divide-slate-200 dark:divide-slate-700">
                            {sortedUsers.map(user => (
                                <div key={user.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <div className="flex-1">
                                        <p className="font-semibold text-slate-900 dark:text-slate-100">{user.username}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${roleStyles[user.role]}`}>{t(user.role)}</span>
                                            {user.branchNames && user.branchNames.length > 0 ? (
                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                    {user.branchNames.join(', ')}
                                                </span>
                                            ) : (user as any).branchName ? (
                                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                                    {(user as any).branchName}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button onClick={() => handleEditUser(user)} className="p-2 rounded-full text-sky-600 hover:bg-sky-100 dark:text-sky-400 dark:hover:bg-slate-600 transition-colors"><PencilIcon /></button>
                                        <button 
                                            onClick={() => handleDeleteClick(user.id)} 
                                            disabled={user.id === currentUser?.id}
                                            className={`p-2 rounded-full transition-colors ${user.id === currentUser?.id ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' : 'text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-slate-600'}`}
                                            title={user.id === currentUser?.id ? t('cannotDeleteSelf') : t('deleteUser')}
                                        >
                                            <TrashIcon />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-slate-500 dark:text-slate-400 py-12">
                            <UsersIcon className="mx-auto h-12 w-12 text-slate-400" />
                            <p className="mt-2">{t('noUsersFound')}</p>
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={userToEdit ? t('editUser') : t('addUser')}>
                <UserForm 
                    onSave={handleSave}
                    onClose={() => setIsModalOpen(false)}
                    userToEdit={userToEdit}
                />
            </Modal>
            
            <ConfirmModal
              isOpen={confirmDeleteState?.isOpen ?? false}
              onClose={() => setConfirmDeleteState(null)}
              onConfirm={confirmDelete}
              title={t('confirmDeleteUserTitle')}
            >
              {t('confirmDeleteUserMessage')}
            </ConfirmModal>
        </>
    );
};

export default UserManagement;