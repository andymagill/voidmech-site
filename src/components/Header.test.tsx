// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryHistory, createRootRoute, createRouter } from '@tanstack/react-router'
import '#/test/dom-matchers'
import Header from './Header'

afterEach(cleanup)

async function renderHeader() {
  const router = createRouter({
    routeTree: createRootRoute({ component: Header }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  render(<RouterProvider router={router} />)
  await screen.findByRole('banner')
}

describe('Header', () => {
  it('contains no headings: the logo is a link, and each page owns its single h1', async () => {
    await renderHeader()

    expect(screen.queryAllByRole('heading')).toHaveLength(0)
    expect(screen.getByRole('link', { name: /alpha/i })).toBeInTheDocument()
  })
})
