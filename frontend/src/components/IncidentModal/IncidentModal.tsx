import React, { useState, useEffect } from 'react';
import { X, MapPin, Camera, AlertTriangle, Upload, Trash2 } from 'lucide-react';
import styles from './IncidentModal.module.css';
import api from '@/services/api';

interface IncidentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: any) => void;
    initialLocation: [number, number] | null;
}

export default function IncidentModal({ isOpen, onClose, onSubmit, initialLocation }: IncidentModalProps) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        type: 'WARNING',
        category: '',
        description: '',
        lat: 0,
        lng: 0,
    });
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [endereco, setEndereco] = useState<string>('');

    // Update location when initialLocation changes
    useEffect(() => {
        if (initialLocation) {
            setFormData(prev => ({
                ...prev,
                lat: initialLocation[0],
                lng: initialLocation[1],
            }));
            // CA06 (1.2.1): Reverse Geocoding - get address from coordinates
            api.reverseGeocode(initialLocation[0], initialLocation[1]).then(setEndereco);
        }
    }, [initialLocation]);

    if (!isOpen) return null;

    const validate = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.category) {
            newErrors.category = 'Selecione uma categoria';
        }

        if (formData.description.length < 20) {
            newErrors.description = `A descrição deve ter no mínimo 20 caracteres (atual: ${formData.description.length})`;
        }

        if (formData.description.length > 500) {
            newErrors.description = `A descrição deve ter no máximo 500 caracteres (atual: ${formData.description.length})`;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNextStep = () => {
        if (validate()) {
            setStep(2);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            time: new Date().toISOString(),
            author: 'Usuário Local',
            veracity: 1,
        });
        // Reset
        setStep(1);
        setFormData({ type: 'WARNING', category: '', description: '', lat: 0, lng: 0 });
        setFiles([]);
        setPreviews([]);
        setErrors({});
        onClose();
    };

    // File handling (CA01-CA12 of 1.2.4)
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []);
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        for (const file of selectedFiles) {
            if (!allowedTypes.includes(file.type)) {
                setErrors(prev => ({ ...prev, files: `Formato não suportado: ${file.type}. Use JPG, PNG, WEBP ou MP4.` }));
                return;
            }
            if (file.size > maxSize) {
                setErrors(prev => ({ ...prev, files: 'Arquivo muito grande. O limite é 5MB.' }));
                return;
            }
        }

        // Max 3 files
        const totalFiles = [...files, ...selectedFiles].slice(0, 3);
        setFiles(totalFiles);

        // Generate previews
        const newPreviews = totalFiles.map(f => URL.createObjectURL(f));
        setPreviews(newPreviews);
        setErrors(prev => { const { files: _, ...rest } = prev; return rest; });
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
        setPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const categories: Record<string, { label: string; value: string }[]> = {
        CRITICAL: [
            { label: 'Assalto à mão armada', value: 'Assalto à mão armada' },
            { label: 'Homicídio/Tiroteio', value: 'Homicídio/Tiroteio' },
            { label: 'Agressão Física', value: 'Agressão Física' },
        ],
        WARNING: [
            { label: 'Furto', value: 'Furto' },
            { label: 'Buraco na Via', value: 'Buraco na Via' },
            { label: 'Iluminação Deficiente', value: 'Iluminação Deficiente' },
            { label: 'Acidente de Trânsito', value: 'Acidente de Trânsito' },
        ],
        EVENT: [
            { label: 'Mutirão de Limpeza', value: 'Mutirão de Limpeza' },
            { label: 'Feira de Bairro', value: 'Feira de Bairro' },
            { label: 'Festa Comunitária', value: 'Festa Comunitária' },
            { label: 'Reunião de Bairro', value: 'Reunião de Bairro' },
            { label: 'Evento Esportivo', value: 'Evento Esportivo' },
        ],
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h2>Registrar Nova Ocorrência</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Progress Steps */}
                <div style={{
                    display: 'flex', padding: '12px 24px',
                    background: 'var(--bg-primary)',
                    borderBottom: '1px solid var(--glass-border)',
                    gap: 8,
                }}>
                    {[1, 2].map(s => (
                        <div key={s} style={{
                            flex: 1, height: 4, borderRadius: 2,
                            background: s <= step ? 'var(--primary-color)' : 'var(--glass-border)',
                            transition: 'background 0.3s',
                        }} />
                    ))}
                </div>

                <form onSubmit={handleSubmit} className={styles.content}>
                    {step === 1 && (
                        <div className={styles.step}>
                            <h3>1. O que aconteceu?</h3>

                            <div className={styles.typeSelector}>
                                {[
                                    { type: 'CRITICAL', label: 'Crime Violento', sub: 'Assalto, Agressão', style: 'activeCritical' },
                                    { type: 'WARNING', label: 'Furto / Risco', sub: 'Furto, Falta de Luz', style: 'activeWarning' },
                                    { type: 'EVENT', label: 'Evento', sub: 'Feira, Mutirão', style: 'activeEvent' },
                                ].map(item => (
                                    <label key={item.type}
                                        className={`${styles.typeCard} ${formData.type === item.type ? styles[item.style] : ''}`}>
                                        <input type="radio" name="type" value={item.type}
                                            checked={formData.type === item.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value, category: '' })} />
                                        <AlertTriangle size={22} />
                                        <span>{item.label}</span>
                                        <small>{item.sub}</small>
                                    </label>
                                ))}
                            </div>

                            <div className={styles.formGroup}>
                                <label>Categoria Específica *</label>
                                <select
                                    required
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className={styles.input}
                                    style={errors.category ? { borderColor: '#ef4444' } : {}}
                                >
                                    <option value="">Selecione...</option>
                                    {(categories[formData.type] || []).map(cat => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                                {errors.category && <span style={{ color: '#ef4444', fontSize: 12 }}>{errors.category}</span>}
                            </div>

                            <div className={styles.formGroup}>
                                <label>Descrição Detalhada * ({formData.description.length}/500)</label>
                                <textarea
                                    required
                                    placeholder="Descreva o que aconteceu em detalhes (mínimo 20 caracteres)..."
                                    className={styles.input}
                                    rows={4}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    maxLength={500}
                                    style={errors.description ? { borderColor: '#ef4444' } : {}}
                                />
                                {errors.description && <span style={{ color: '#ef4444', fontSize: 12 }}>{errors.description}</span>}
                                {formData.description.length < 20 && formData.description.length > 0 && (
                                    <span style={{ color: '#f59e0b', fontSize: 11 }}>
                                        Faltam {20 - formData.description.length} caracteres
                                    </span>
                                )}
                            </div>

                            <button type="button" className={styles.primaryBtn} onClick={handleNextStep}>
                                Próximo Passo
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className={styles.step}>
                            <h3>2. Local e Evidências</h3>

                            <div className={styles.formGroup}>
                                <label>Localização</label>
                                <div className={styles.locationBox}>
                                    <MapPin size={20} color="var(--primary-color)" />
                                    <div style={{ flex: 1 }}>
                                        <span>
                                            {initialLocation
                                                ? `${initialLocation[0].toFixed(5)}, ${initialLocation[1].toFixed(5)}`
                                                : 'Clique no mapa para definir...'}
                                        </span>
                                        {endereco && (
                                            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                                                📍 {endereco}
                                            </div>
                                        )}
                                    </div>
                                    {initialLocation && (
                                        <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 600 }}>
                                            ✓ Definido
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Media Upload (Feature 1.2.4) */}
                            <div className={styles.formGroup}>
                                <label>Fotos / Vídeos (max 3 arquivos, 5MB cada)</label>

                                {/* Thumbnails Grid */}
                                {previews.length > 0 && (
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                                        {previews.map((src, i) => (
                                            <div key={i} style={{
                                                width: 80, height: 80, borderRadius: 8,
                                                overflow: 'hidden', position: 'relative',
                                                border: '1px solid var(--glass-border)',
                                            }}>
                                                <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                <button type="button" onClick={() => removeFile(i)}
                                                    style={{
                                                        position: 'absolute', top: 2, right: 2,
                                                        background: 'rgba(239,68,68,0.9)', color: 'white',
                                                        border: 'none', borderRadius: 4, width: 20, height: 20,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        cursor: 'pointer', padding: 0,
                                                    }}>
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {files.length < 3 && (
                                    <div className={styles.uploadBox}>
                                        <Camera size={24} />
                                        <span>Adicionar Mídia (Opcional)</span>
                                        <small style={{ color: 'var(--text-secondary)' }}>JPG, PNG, WEBP, MP4</small>
                                        <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4"
                                            multiple onChange={handleFileSelect}
                                            className={styles.hiddenFile} />
                                    </div>
                                )}
                                {errors.files && <span style={{ color: '#ef4444', fontSize: 12 }}>{errors.files}</span>}
                            </div>

                            <div className={styles.actionButtons}>
                                <button type="button" className={styles.secondaryBtn} onClick={() => setStep(1)}>
                                    Voltar
                                </button>
                                <button type="submit" className={styles.primaryBtn}
                                    disabled={!initialLocation}
                                    style={{ flex: 2 }}>
                                    🚨 Publicar Alerta
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
