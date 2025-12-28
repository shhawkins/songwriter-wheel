import React, { useEffect } from 'react';
import { useSongStore } from '../../store/useSongStore';
import DraggableModal from '../ui/DraggableModal';
import { PatchManager } from './PatchManager';
import { useMobileLayout } from '../../hooks/useIsMobile';

export const PatchManagerModal: React.FC = () => {
    const {
        patchManagerModalVisible,
        togglePatchManagerModal,
        patchManagerInitialView,
        modalStack,
        bringToFront
    } = useSongStore();

    const { isMobile, isLandscape } = useMobileLayout();
    const isCompact = isMobile && isLandscape;

    // Manage Z-Index
    const MODAL_ID = 'patch-manager';
    const stackIndex = modalStack.indexOf(MODAL_ID);
    const zIndex = stackIndex >= 0 ? 120 + stackIndex * 10 : 120;

    useEffect(() => {
        if (patchManagerModalVisible) {
            bringToFront(MODAL_ID);
        }
    }, [patchManagerModalVisible, bringToFront]);

    if (!patchManagerModalVisible) return null;

    return (
        <DraggableModal
            isOpen={patchManagerModalVisible}
            onClose={() => togglePatchManagerModal(false)}
            zIndex={zIndex}
            onInteraction={() => bringToFront(MODAL_ID)}
            dataAttribute="patch-manager"
            compact={isCompact}
            minWidth={isMobile ? '300px' : '350px'}
            minHeight="400px" // Ensure a reasonable minimum height
            resizable={true} // Allow resizing
            width={isMobile ? '320px' : '400px'}

        >
            <div className="w-full flex-1 overflow-hidden flex flex-col items-center">
                <PatchManager
                    onClose={() => togglePatchManagerModal(false)}
                    initialView={patchManagerInitialView}
                />
            </div>
        </DraggableModal>
    );
};
