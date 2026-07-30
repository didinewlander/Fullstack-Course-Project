
const AppError = require("../utils/AppError");

const fs = require("fs/promises");
const path = require("path");

const invoiceService = require("../services/invoice.service");

const asyncHandler = require("../utils/routerHandler");

const { uploadDirectory } = require("../middleware/invoiceUploadMiddleware");

const createInvoiceForOrder = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.createInvoiceForOrder({
    orderId: req.params.orderId,
    actor: req.auth,
    session: req.mongoSession,
  });

  res.status(201).json({
    success: true,
    data: invoice,
  });
});

const getInvoiceById = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getInvoiceById({
    invoiceId: req.params.invoiceId,
    actor: req.auth,
  });

  res.status(200).json({
    success: true,
    data: invoice,
  });
});

const getMyInvoices = asyncHandler(async (req, res) => {
  const result = await invoiceService.getMyInvoices({
    actor: req.auth,
    page: req.query.page,
    limit: req.query.limit,
    status: req.query.status,
  });

  res.status(200).json({
    success: true,
    data: result.invoices,
    pagination: result.pagination,
  });
});

const getAllInvoices = asyncHandler(async (req, res) => {
  const result = await invoiceService.getAllInvoices({
    actor: req.auth,
    page: req.query.page,
    limit: req.query.limit,
    status: req.query.status,

    supplierId: req.query.supplierId,

    orderedByUserId: req.query.orderedByUserId,

    orderId: req.query.orderId,
  });

  res.status(200).json({
    success: true,
    data: result.invoices,
    pagination: result.pagination,
  });
});

/*
 * This controller uses its own try/catch so an uploaded
 * file can be deleted when the database operation fails.
 */
const attachInvoiceFile = async (req, res, next) => {
  if (!req.file) {
    return next(
      new AppError(
        "Invoice PDF file is required",
        400,
        "INVOICE_FILE_REQUIRED",
      ),
    );
  }

  const relativeStoragePath = path
    .relative(process.cwd(), req.file.path)
    .split(path.sep)
    .join("/");

  try {
    const result = await invoiceService.attachInvoiceFile({
      invoiceId: req.params.invoiceId,

      actor: req.auth,

      file: {
        storagePath: relativeStoragePath,

        originalFileName: req.file.originalname,

        mimeType: req.file.mimetype,

        fileSize: req.file.size,
      },
    });

    /*
     * Remove the previously attached draft file
     * after the database was updated successfully.
     */
    if (
      result.previousStoragePath &&
      result.previousStoragePath !== relativeStoragePath
    ) {
      await fs
        .unlink(path.resolve(process.cwd(), result.previousStoragePath))
        .catch(() => {});
    }

    return res.status(200).json({
      success: true,
      data: result.invoice,
    });
  } catch (error) {
    /*
     * Avoid leaving an orphan file when validation
     * or authorization fails.
     */
    await fs.unlink(req.file.path).catch(() => {});

    return next(error);
  }
};

const submitInvoiceForApproval = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.submitInvoiceForApproval({
    invoiceId: req.params.invoiceId,

    actor: req.auth,
  });

  res.status(200).json({
    success: true,
    data: invoice,
  });
});

const approveInvoice = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.approveInvoice({
    invoiceId: req.params.invoiceId,

    actor: req.auth,
  });

  res.status(200).json({
    success: true,
    data: invoice,
  });
});

const downloadInvoiceFile = asyncHandler(async (req, res) => {
  const file = await invoiceService.getInvoiceFile({
    invoiceId: req.params.invoiceId,

    actor: req.auth,
  });

  const absolutePath = path.resolve(process.cwd(), file.storagePath);

  const permittedRoot = `${uploadDirectory}${path.sep}`;

  if (
    absolutePath !== uploadDirectory &&
    !absolutePath.startsWith(permittedRoot)
  ) {
    throw new Error("Invalid stored invoice path");
  }

  res.download(absolutePath, file.downloadName);
});

/*
 * Renders the invoice as a PDF and streams it straight back, WITHOUT storing
 * it. This is the review copy - a supplier can look at exactly what the
 * document will say before committing to it.
 */
const previewInvoiceFile = asyncHandler(async (req, res) => {
  const { buffer, fileName } = await invoiceService.renderInvoicePdf({
    invoiceId: req.params.invoiceId,
    actor: req.auth,
  });

  res.setHeader("Content-Type", "application/pdf");

  // inline, so the browser opens it in a tab instead of downloading it
  res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
  res.setHeader("Content-Length", buffer.length);

  res.send(buffer);
});

/*
 * Generates the PDF and saves it as the invoice's file, replacing any
 * previously attached one.
 */
const generateInvoiceFile = asyncHandler(async (req, res) => {
  const { invoice, previousStoragePath } =
    await invoiceService.generateInvoiceFile({
      invoiceId: req.params.invoiceId,
      actor: req.auth,
    });

  // remove the superseded file, but never fail the request over it
  if (previousStoragePath) {
    const absolutePath = path.resolve(process.cwd(), previousStoragePath);

    if (absolutePath.startsWith(`${uploadDirectory}${path.sep}`)) {
      await fs.unlink(absolutePath).catch(() => {});
    }
  }

  res.status(200).json({
    success: true,
    data: invoice,
  });
});

module.exports = {
  createInvoiceForOrder,
  getInvoiceById,
  getMyInvoices,
  getAllInvoices,
  attachInvoiceFile,
  generateInvoiceFile,
  previewInvoiceFile,
  submitInvoiceForApproval,
  approveInvoice,
  downloadInvoiceFile,
};
