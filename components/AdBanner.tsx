import { useEffect } from 'react';
import { Box } from '@chakra-ui/react';

interface AdBannerProps {
  dataAdSlot: string;
  dataAdFormat?: string;
  style?: React.CSSProperties;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

const AdBanner: React.FC<AdBannerProps> = ({
  dataAdSlot,
  dataAdFormat = 'auto',
  style = { display: 'block' },
  className = ''
}) => {
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, []);

  return (
    <Box className={className} textAlign="center" my={4}>
      <ins
        className="adsbygoogle"
        style={style}
        data-ad-client="ca-pub-3472536634074099"
        data-ad-slot={dataAdSlot}
        data-ad-format={dataAdFormat}
        data-full-width-responsive="true"
      />
    </Box>
  );
};

export default AdBanner;