# Car Insurance Comparison Website

A sleek, modern car insurance comparison platform built with React and TypeScript. This application provides users with a personalized quiz-based experience to compare insurance products with dynamic scoring and legal compliance for price display.

## 🚀 Features

### Smart Quiz System
- **Multi-step questionnaire**: State, age group, gender selection
- **Priority-based filtering**: Choose between Price or Features focus
- **Advanced feature selection**: Storm Coverage, Windscreen, Personal Effects, Accidental Damage, New Car Replacement
- **Progress tracking**: Visual progress indicators throughout the quiz

### Dynamic Scoring System
- **Price Rating**: 1.0-9.9 scale (higher = more competitive pricing)
- **Feature Score**: 0-10 scale with intelligent weighting based on user selections
- **Dynamic Finder Score**: Combines price and feature scores based on user priority
  - Price Priority: 85% Price Rating + 15% Feature Score
  - Features Priority: 85% Feature Score + 15% Price Rating

### Advanced Weighting Logic
- **1 Feature Selected**: 60% selected, 40% distributed among others
- **2 Features Selected**: 40% each selected, 20% distributed among others
- **3 Features Selected**: 30% each selected, 10% distributed among others
- **4 Features Selected**: 25% each selected, 0% for non-selected
- **5 Features Selected**: Equal 20% weighting

### Modern UI/UX
- **Circular progress indicators**: Speedometer-style visualizations for scores
- **Staggered loading animations**: Creates impression of personalized calculation
- **Color-coded scoring**: Visual feedback with green/yellow/red indicators
- **Responsive design**: Works seamlessly across devices

## 🛠️ Tech Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Inline CSS (removed Tailwind for stability)
- **Data Processing**: Papa Parse for CSV handling
- **State Management**: React Hooks (useState, useEffect)

## 📊 Data Processing

### Feature Sub-Scores
- **Boolean Features**: 10 points if available, 0 if not
- **Numeric Features**: 1.0-9.9 scale based on relative values
- **Weighted Averaging**: Based on user feature selections

### Legal Compliance
- No actual prices displayed (legal requirement)
- Price ratings provide competitive indication
- Transparent about limitations with user-friendly messaging

## 🚀 Getting Started

### Prerequisites
- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd fci-exp
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173/`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 📁 Project Structure

```
src/
├── components/
│   └── InsuranceQuiz.tsx    # Main quiz component
├── types/
│   └── index.ts             # TypeScript type definitions
├── utils/
│   └── csvLoader.ts         # Data processing utilities
├── App.tsx                  # Root component
├── main.tsx                 # Application entry point
└── index.css               # Global styles

public/
└── insurance-data.csv      # Insurance product data
```

## 🎯 Key Components

### InsuranceQuiz.tsx
- Main application logic and UI
- Quiz flow management
- Score loading animations
- Results table rendering

### csvLoader.ts
- CSV data parsing and processing
- Feature score calculations
- Weighted averaging algorithms
- Product filtering and sorting

### types/index.ts
- TypeScript interfaces for type safety
- Data structure definitions
- Feature and priority type definitions

## 🎨 Design Features

- **Blue background** with **yellow quiz cards** for modern aesthetic
- **Circular progress indicators** for intuitive score visualization
- **Staggered loading animations** (300ms intervals) for perceived personalization
- **Clean, professional table design** with hover effects

## 🔧 Customization

### Adding New Features
1. Update the `Feature` type in `src/types/index.ts`
2. Add processing logic in `src/utils/csvLoader.ts`
3. Update the UI in `src/components/InsuranceQuiz.tsx`

### Modifying Score Calculations
- Edit `calculateWeightedFeatureScore` function for feature weighting
- Update `calculateDynamicFinderScore` for final score combination
- Adjust color thresholds in scoring helper functions

## 📈 Performance Features

- **Efficient data processing**: Single calculation pass for all scores
- **Optimized rendering**: Conditional rendering with loading states
- **Smooth animations**: CSS transitions for professional feel

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with modern React patterns and TypeScript for type safety
- Designed with user experience and legal compliance in mind
- Implements advanced scoring algorithms for fair comparison 