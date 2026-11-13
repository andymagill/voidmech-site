import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import AlphaNotice from '../components/AlphaNotice'
import Footer from '../components/Footer'
import Header from '../components/Header'
import { SubmissionModals } from '../components/SubmissionModals'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'VoidMech | Official Site',
      },
      {
        name: 'description',
        content:
          'Official VoidMech site: alpha download, game intel, and player submission channels.',
      },
      {
        property: 'og:site_name',
        content: 'VoidMech',
      },
      {
        property: 'og:title',
        content: 'VoidMech | Official Site',
      },
      {
        property: 'og:description',
        content:
          'Official VoidMech site: alpha download, game intel, and player submission channels.',
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        property: 'og:url',
        content: 'https://voidmech.com/',
      },
      {
        property: 'og:image',
        content: 'https://voidmech.com/assets/images/voidmech-meta.jpg',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: 'VoidMech | Official Site',
      },
      {
        name: 'twitter:description',
        content:
          'Official VoidMech site: alpha download, game intel, and player submission channels.',
      },
      {
        name: 'twitter:image',
        content: 'https://voidmech.com/assets/images/voidmech-meta.jpg',
      },
      {
        name: 'theme-color',
        content: '#070b14',
      },
    ],
    links: [
      {
        rel: 'canonical',
        href: 'https://voidmech.com/',
      },
      {
        rel: 'icon',
        href: '/assets/icons/favicon.png',
        type: 'image/png',
      },
      {
        rel: 'apple-touch-icon',
        href: '/assets/icons/favicon.png',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(34,224,240,0.4)]">
        <Header />
        <AlphaNotice />
        {children}
        <Footer />
        <SubmissionModals />
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
