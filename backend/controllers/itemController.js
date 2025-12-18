const Item = require('../models/Item');

exports.createItem = async (req, res) => {
  try {
    let { stockId, name, unit, minStockLevel } = req.body;

    // Auto-generate stock ID if not provided
    if (!stockId) {
      let isUnique = false;
      while (!isUnique) {
        stockId = Math.floor(100000 + Math.random() * 900000).toString();
        const existingItem = await Item.findOne({ stockId });
        if (!existingItem) {
          isUnique = true;
        }
      }
    }

    const item = await Item.create({
      stockId,
      name,
      unit,
      minStockLevel: minStockLevel || 10,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: item,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getItems = async (req, res) => {
  try {
    const { search, lowStock, page = 1, limit = 10 } = req.query;
    
    const query = {};
    
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    if (lowStock === 'true') {
      query.$expr = { $lte: ['$currentStock', '$minStockLevel'] };
    }

    const items = await Item.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Item.countDocuments(query);

    res.status(200).json({
      success: true,
      data: items,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const { stockId, name, unit, minStockLevel, currentStock, lastPurchaseRate, newPrice, lastUpdatedDate } = req.body;

    let item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found',
      });
    }

    const updateData = {};
    if (stockId !== undefined) updateData.stockId = stockId;
    if (name !== undefined) updateData.name = name;
    if (unit !== undefined) updateData.unit = unit;
    if (minStockLevel !== undefined) updateData.minStockLevel = minStockLevel;
    if (currentStock !== undefined) updateData.currentStock = currentStock;
    if (lastPurchaseRate !== undefined) updateData.lastPurchaseRate = lastPurchaseRate;
    if (newPrice !== undefined) updateData.newPrice = newPrice;
    if (lastUpdatedDate !== undefined) updateData.lastUpdatedDate = lastUpdatedDate;

    item = await Item.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getLowStockItems = async (req, res) => {
  try {
    const items = await Item.find({
      $expr: { $lte: ['$currentStock', '$minStockLevel'] }
    }).sort({ currentStock: 1 });

    res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
