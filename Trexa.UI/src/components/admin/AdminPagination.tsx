import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../ui/pagination';

interface AdminPaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

export function getPaginationPage(page: number, totalItems: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  return Math.min(Math.max(page, 1), totalPages);
}

export function getPaginationRange(page: number, totalItems: number, pageSize: number) {
  const currentPage = getPaginationPage(page, totalItems, pageSize);
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return { currentPage, end, start, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)) };
}

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 'ellipsis-end', totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, 'ellipsis-start', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, 'ellipsis-start', currentPage - 1, currentPage, currentPage + 1, 'ellipsis-end', totalPages];
}

export function AdminPagination({ page, pageSize, totalItems, onPageChange }: AdminPaginationProps) {
  const { currentPage, end, start, totalPages } = getPaginationRange(page, totalItems, pageSize);

  if (totalItems <= pageSize) {
    return null;
  }

  const handlePageChange = (nextPage: number) => {
    onPageChange(getPaginationPage(nextPage, totalItems, pageSize));
  };

  return (
    <div className="admin-pagination">
      <p className="admin-pagination-summary">
        Showing {start}-{end} of {totalItems}
      </p>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              aria-disabled={currentPage === 1}
              onClick={(event) => {
                event.preventDefault();
                if (currentPage > 1) handlePageChange(currentPage - 1);
              }}
            />
          </PaginationItem>

          {getVisiblePages(currentPage, totalPages).map((item) => (
            <PaginationItem key={item}>
              {typeof item === 'number' ? (
                <PaginationLink
                  href="#"
                  isActive={item === currentPage}
                  onClick={(event) => {
                    event.preventDefault();
                    handlePageChange(item);
                  }}
                >
                  {item}
                </PaginationLink>
              ) : (
                <PaginationEllipsis />
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              href="#"
              aria-disabled={currentPage === totalPages}
              onClick={(event) => {
                event.preventDefault();
                if (currentPage < totalPages) handlePageChange(currentPage + 1);
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
