export const pollForConfirmation = async (
    fetchStatus: () => Promise<'confirmed' | 'finalized' | 'pending' | 'processed'>, // Allow 'processed' status
    interval: number = 1000
  ): Promise<void> => {
    while (true) {
      const status = await fetchStatus();
      if (status === 'confirmed' || status === 'finalized' || status === 'processed') {
        return; // Consider the transaction as confirmed if it's processed or finalized
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  };
  