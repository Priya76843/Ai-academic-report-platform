import type { ReactNode } from "react"

type PageContainerProps = {
  children: ReactNode
}

function PageContainer({ children }: PageContainerProps) {
  return (
    <main className="flex-1 p-6 md:p-8">
      <div className="mx-auto w-full max-w-7xl">
        {children}
      </div>
    </main>
  )
}

export default PageContainer