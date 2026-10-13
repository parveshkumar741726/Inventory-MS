import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/apiAuth';
import Purchase from '@/backend/models/Purchase';
import PurchaseItem from '@/backend/models/PurchaseItem';
import Item from '@/backend/models/Item';
import { createLedgerEntry } from '@/backend/utils/ledgerHelper';
import { createAuditLog } from '@/backend/utils/auditLogger';
import cloudinary from '@/backend/config/cloudinary';

export async function GET(request: NextRequest) {
  const { user, errorResponse } = await authenticateRequest(request);
  if (errorResponse) return errorResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    const vendor = searchParams.get('vendor');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const query: any = { isDeleted: false };

    if (vendor) query.vendor = vendor;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.invoiceDate = {};
      if (startDate) query.invoiceDate.$gte = new Date(startDate);
      if (endDate) query.invoiceDate.$lte = new Date(endDate);
    }

    const purchases = await (Purchase as any).find(query)
      .sort({ invoiceDate: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('vendor')
      .populate('createdBy', 'name email');

    const count = await (Purchase as any).countDocuments(query);

    return NextResponse.json({
      success: true,
      data: purchases,
      pagination: {
        total: count,
        page,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const { user, errorResponse } = await authenticateRequest(request);
  if (errorResponse) return errorResponse;

  try {
    let vendor: string;
    let invoiceNumber: string;
    let invoiceDate: any;
    let itemsStr: string;
    let taxType: string = 'exclusive';
    let notes: string = '';
    let damageQuantity: number = 0;
    let missingQuantity: number = 0;
    let remark: string = '';
    let invoiceFile: any = {};

    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      vendor = formData.get('vendor') as string;
      invoiceNumber = formData.get('invoiceNumber') as string;
      invoiceDate = formData.get('invoiceDate');
      itemsStr = formData.get('items') as string;
      taxType = (formData.get('taxType') as string) || 'exclusive';
      notes = (formData.get('notes') as string) || '';
      damageQuantity = parseFloat((formData.get('damageQuantity') as string) || '0');
      missingQuantity = parseFloat((formData.get('missingQuantity') as string) || '0');
      remark = (formData.get('remark') as string) || '';

      const file = formData.get('invoiceFile');
      if (file && typeof file === 'object' && 'arrayBuffer' in file) {
        try {
          const buffer = Buffer.from(await (file as Blob).arrayBuffer());
          const base64Str = buffer.toString('base64');
          const mimeType = (file as any).type || 'image/jpeg';
          const dataUri = `data:${mimeType};base64,${base64Str}`;

          const result = await cloudinary.uploader.upload(dataUri, {
            folder: 'invoices',
            resource_type: 'auto',
          });
          invoiceFile = {
            url: result.secure_url,
            publicId: result.public_id,
          };
        } catch (uploadErr) {
          console.error('Invoice upload error:', uploadErr);
        }
      }
    } else {
      const body = await request.json();
      vendor = body.vendor;
      invoiceNumber = body.invoiceNumber;
      invoiceDate = body.invoiceDate;
      itemsStr = typeof body.items === 'string' ? body.items : JSON.stringify(body.items || []);
      taxType = body.taxType || 'exclusive';
      notes = body.notes || '';
      damageQuantity = body.damageQuantity || 0;
      missingQuantity = body.missingQuantity || 0;
      remark = body.remark || '';
    }

    const parsedItems: any[] = JSON.parse(itemsStr || '[]');
    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    const calculatedItems = parsedItems.map((item) => {
      const qty = Number(item.quantity) || 0;
      const rate = Number(item.rate) || 0;
      const taxPercent = Number(item.taxPercent) || 0;
      const discountPercent = Number(item.discountPercent) || 0;

      const gross = Math.round(qty * rate * 100) / 100;
      const itemDiscount = Math.round(((gross * discountPercent) / 100) * 100) / 100;
      totalDiscount += itemDiscount;

      let itemSubtotal: number;
      let itemTax: number;
      let itemTotal: number;

      if (taxType === 'inclusive') {
        itemTotal = Math.round((gross - itemDiscount) * 100) / 100;
        itemSubtotal = Math.round((itemTotal / (1 + taxPercent / 100)) * 100) / 100;
        itemTax = Math.round((itemTotal - itemSubtotal) * 100) / 100;
      } else {
        itemSubtotal = Math.round((gross - itemDiscount) * 100) / 100;
        itemTax = Math.round(((itemSubtotal * taxPercent) / 100) * 100) / 100;
        itemTotal = Math.round((itemSubtotal + itemTax) * 100) / 100;
      }

      subtotal += itemSubtotal;
      totalTax += itemTax;

      return {
        ...item,
        quantity: qty,
        rate,
        taxPercent,
        discountPercent,
        discountAmount: itemDiscount,
        itemSubtotal,
        itemTax,
        itemTotal,
      };
    });

    subtotal = Math.round(subtotal * 100) / 100;
    totalTax = Math.round(totalTax * 100) / 100;
    const rawTotal = subtotal + totalTax;
    const roundedTotal = Math.round(rawTotal);
    const roundOff = Math.round((roundedTotal - rawTotal) * 100) / 100;
    const total = roundedTotal;

    const purchase = await (Purchase as any).create({
      vendor,
      invoiceNumber,
      invoiceDate,
      invoiceFile,
      taxType,
      subtotal,
      totalTax,
      discount: totalDiscount,
      roundOff,
      total,
      pendingAmount: total,
      notes,
      damageQuantity,
      missingQuantity,
      remark,
      createdBy: user!._id,
    });

    for (const itemData of calculatedItems) {
      let item = await (Item as any).findOne({ name: itemData.itemName, isDeleted: false });

      if (!item) {
        item = await (Item as any).create({
          name: itemData.itemName,
          unit: itemData.unit,
          currentStock: 0,
          createdBy: user!._id,
        });
      }

      item.currentStock += itemData.quantity;
      item.lastPurchaseRate = itemData.rate;
      await item.save();

      await (PurchaseItem as any).create({
        purchase: purchase._id,
        item: item._id,
        itemName: itemData.itemName,
        quantity: itemData.quantity,
        unit: itemData.unit,
        rate: itemData.rate,
        taxPercent: itemData.taxPercent || 0,
        taxAmount: itemData.itemTax,
        subtotal: itemData.itemSubtotal,
        total: itemData.itemTotal,
      });
    }

    await createLedgerEntry(
      vendor,
      'purchase',
      total,
      `Invoice #${invoiceNumber}`,
      purchase._id,
      `Purchase invoice #${invoiceNumber}`,
      invoiceDate,
      user!._id
    );

    await (createAuditLog as any)({
      user: user!._id,
      action: 'create',
      entity: 'purchase',
      entityId: purchase._id,
      description: `Created purchase: Invoice #${invoiceNumber}`,
    });

    const populatedPurchase = await (Purchase as any).findById(purchase._id)
      .populate('vendor')
      .populate('createdBy', 'name email');

    return NextResponse.json({
      success: true,
      data: populatedPurchase,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
