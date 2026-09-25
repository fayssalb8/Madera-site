import type { WizardPayload } from '@/types/wizard';
import { leadsApi, publicAttachmentUpload } from '@/lib/api';
import {
  MAX_ATTACHMENT_FILES,
  isAcceptedAttachmentFile,
} from '@/lib/constants';

/**
 * Upload attachments sequentially; a single failure does not discard the
 * URLs already uploaded (they are still submitted with the lead).
 */
async function uploadAttachments(
  files: File[]
): Promise<{ urls: string[]; failed: string[] }> {
  const urls: string[] = [];
  const failed: string[] = [];

  for (const file of files.slice(0, MAX_ATTACHMENT_FILES)) {
    if (!isAcceptedAttachmentFile(file)) {
      failed.push(file.name);
      continue;
    }
    try {
      const url = await publicAttachmentUpload(file);
      urls.push(url);
    } catch {
      failed.push(file.name);
    }
  }
  return { urls, failed };
}

export interface SubmitResult {
  success: boolean;
  /** Server-generated lead reference, available on success. */
  leadId?: string;
  error?: string;
}

export async function submitWizard(payload: WizardPayload): Promise<SubmitResult> {
  try {
    const attachmentFiles = payload.dimensions?.attachmentFiles as File[] | undefined;
    let attachmentUrls: string[] = [];

    if (attachmentFiles && attachmentFiles.length > 0) {
      const { urls, failed } = await uploadAttachments(attachmentFiles);
      attachmentUrls = urls;
      if (urls.length === 0 && failed.length > 0) {
        return {
          success: false,
          error:
            'Impossible de téléverser vos fichiers. Vérifiez leur format (JPEG, PNG ou WebP) puis réessayez.',
        };
      }
    }

    const { id } = await leadsApi.create({
      name: payload.contact?.name,
      phone: payload.contact?.phone,
      wilaya: payload.contact?.wilaya,
      email: payload.contact?.email,
      material: payload.material,
      hardware: payload.hardware,
      measures: payload.dimensions?.manualMeasures,
      oven_column: payload.dimensions?.ovenColumn ? 'Oui' : 'Non',
      dishwasher: payload.dimensions?.dishwasherIntegrated ? 'Oui' : 'Non',
      washing_machine: payload.dimensions?.washingMachineIntegrated ? 'Oui' : 'Non',
      attachments: attachmentUrls,
      source: payload.source,
    });

    return { success: true, leadId: id };
  } catch (err) {
    // Surface the server's French validation message when available.
    const message = err instanceof Error ? err.message : null;
    console.error('Submission failed:', message);
    return {
      success: false,
      error:
        message ??
        'Erreur de connexion. Vérifiez votre réseau puis réessayez.',
    };
  }
}
