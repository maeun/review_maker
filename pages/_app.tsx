import type { AppProps } from 'next/app';
import { Provider } from '../components/ui/provider';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Provider>
      <Component {...pageProps} />
    </Provider>
  );
} 