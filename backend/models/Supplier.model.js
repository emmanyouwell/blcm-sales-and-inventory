import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true
  },
  contactDetails: {
    type: String,
    required: [true, 'Contact details are required'],
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  }
}, {
  timestamps: true
});

export default mongoose.model('Supplier', supplierSchema);

