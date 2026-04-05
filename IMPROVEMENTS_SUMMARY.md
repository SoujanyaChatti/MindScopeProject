# MindScope Dynamic Question Selection & PHQ-9 Integration Improvements

## Overview
This document outlines the comprehensive improvements made to the MindScope depression detection system to implement true dynamic question selection and enhanced PHQ-9 integration.

## Key Improvements Made

### 1. Fixed PHQ-9 Integration Issues

#### Problem Fixed:
- PHQ-9 scoring only counted responses from `phq-9` category questions
- Initial questions and follow-up questions that mapped to PHQ-9 categories were ignored
- Inconsistent scoring across different question types

#### Solution Implemented:
- **Updated Assessment Model** (`backend/models/Assessment.js`):
  - Modified `calculatePHQ9Score()` to count ALL responses with PHQ-9 mapping, regardless of question category
  - Added proper category handling with highest score selection for duplicate categories
  - Enhanced schema to include PHQ-9 category in response mapping

### 2. Enhanced Dynamic Question Selection

#### Problem Fixed:
- Sequential fallback when LLM failed
- No crisis detection in question flow
- Limited context analysis for question selection
- No cultural adaptation

#### Solution Implemented:
- **Completely Rewrote `selectNextQuestion()`** in `geminiService.js`:
  - Added immediate crisis detection before question selection
  - Implemented response pattern analysis
  - Added PHQ-9 category coverage tracking
  - Enhanced LLM prompts with cultural context and crisis keywords
  - Added intelligent fallback selection with priority-based sorting

- **New Helper Methods**:
  - `detectCrisisIndicators()`: Detects crisis keywords in multiple languages
  - `selectCrisisQuestion()`: Prioritizes crisis questions when needed
  - `analyzeResponsePatterns()`: Analyzes severity trends and patterns
  - `intelligentFallbackSelection()`: Smart fallback with priority-based selection

### 3. Cultural Adaptation & Crisis Detection

#### Features Added:
- **Cultural Idiom Detection**: Added support for Hindi expressions like "dil bhaari hai", "mann nahi lagta"
- **Enhanced Crisis Keywords**: Comprehensive list including English and Hindi expressions
- **Crisis-First Logic**: Immediate crisis detection overrides normal question flow
- **Cultural Questions**: Added culturally relevant questions about family, community, and spiritual practices

### 4. Enhanced Question Bank

#### New Question Categories Added:
- **Cultural Questions**: Questions adapted for cultural context
- **Adaptive Questions**: Questions with trigger words for dynamic selection
- **Enhanced Follow-up Questions**: Better structured follow-up questions with PHQ-9 mapping

#### Question Structure Improvements:
- Added `priority` field for better question ordering
- Added `triggers` field for adaptive question selection
- Enhanced PHQ-9 category mapping for all questions

### 5. Improved Assessment Flow

#### Changes Made:
- **Real-time PHQ-9 Calculation**: Scores are recalculated after each response
- **Enhanced Crisis Detection**: Multi-layered crisis detection in question bank
- **Better Response Tracking**: Enhanced response analysis with confidence scores
- **Improved Question Selection**: LLM-based selection with intelligent fallbacks

## Technical Implementation Details

### Files Modified:

1. **`backend/models/Assessment.js`**:
   - Fixed PHQ-9 scoring calculation
   - Added category field to PHQ-9 mapping schema
   - Updated question categories enum

2. **`backend/services/geminiService.js`**:
   - Completely rewrote dynamic question selection
   - Added cultural context to PHQ-9 mapping
   - Implemented crisis detection and response analysis
   - Added intelligent fallback mechanisms

3. **`backend/data/questionBank.js`**:
   - Added cultural and adaptive question categories
   - Enhanced crisis detection logic
   - Added new helper functions for question management

4. **`backend/routes/assessment.js`**:
   - Added real-time PHQ-9 score recalculation
   - Enhanced response handling with new mapping structure

### Key Features:

1. **Crisis Detection**: 
   - Immediate detection of suicidal ideation keywords
   - Multi-language support (English + Hindi)
   - PHQ-9 score-based crisis detection

2. **Dynamic Question Selection**:
   - LLM-powered intelligent selection
   - Priority-based fallback system
   - Coverage gap analysis
   - Severity-based question prioritization

3. **Cultural Adaptation**:
   - Hindi expression recognition
   - Culturally relevant questions
   - Spiritual/religious context consideration

4. **Enhanced PHQ-9 Integration**:
   - All questions with PHQ-9 mapping are scored
   - Real-time score calculation
   - Confidence-weighted scoring
   - Comprehensive category coverage

## Usage Examples

### Crisis Detection Example:
If a user responds with "I feel like ending it all" or "jeena nahi chahta", the system will:
1. Immediately detect crisis indicators
2. Prioritize crisis assessment questions
3. Skip normal question flow
4. Provide immediate support resources

### Dynamic Selection Example:
If a user shows high severity in mood category (score 2-3), the system will:
1. Prioritize mood-related follow-up questions
2. Skip less relevant questions
3. Focus on areas needing deeper exploration
4. Adapt question flow based on response patterns

### Cultural Adaptation Example:
If a user mentions "dil bhaari hai" (heart feels heavy), the system will:
1. Recognize this as a cultural expression of sadness
2. Map it to appropriate PHQ-9 mood category
3. Ask culturally relevant follow-up questions
4. Provide culturally appropriate recommendations

## Benefits Achieved

1. **True Dynamic Selection**: Questions now adapt based on user responses and severity patterns
2. **Crisis Safety**: Immediate crisis detection and intervention
3. **Cultural Sensitivity**: Support for multiple languages and cultural expressions
4. **Accurate PHQ-9 Scoring**: All responses properly mapped and scored
5. **Intelligent Fallbacks**: Robust system that works even when LLM fails
6. **Enhanced User Experience**: More relevant and personalized questioning

## Future Enhancements

The system is now ready for:
1. **Multilingual Support**: Easy addition of more languages
2. **Advanced Analytics**: Better tracking of response patterns
3. **Machine Learning**: Training data collection for improved selection
4. **Integration**: Ready for faculty question bank integration
5. **Research**: Enhanced data collection for academic research

## Testing Recommendations

1. Test crisis detection with various keywords
2. Verify PHQ-9 scoring accuracy across question types
3. Test cultural expression recognition
4. Validate dynamic question selection logic
5. Test fallback mechanisms when LLM fails

The system now provides a truly adaptive, culturally sensitive, and clinically accurate depression assessment experience.
