// Implement in ../utils/securityUtils.ts:
export const maskString = (str: string): string => {
    if (!str) return '';
    const visibleChars = 4;
    return `${str.slice(0, visibleChars)}...${str.slice(-visibleChars)}`;
  };