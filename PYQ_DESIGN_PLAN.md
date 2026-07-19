# PYQ Screen Design and Implementation Plan

**CRITICAL INSTRUCTION FOR IMPLEMENTATION:** 
> Do not make assumptions. If you have any doubts, ask me. Ask questions for important decisions that require my involvement, or if you do not understand anything, just ask me for my opinion on what I want.

## 1. Overview
The goal is to redesign the PYQ experience to match the visual language, layout, and theme of the Courses module.
- **Entry Point**: The middle "Practice" button in the bottom navigation (`MockTestsTabScreen.tsx`).
- **List Screen (PYQ Screen)**: Must replicate the exact design, theme, and component structure of `CoursesScreen.tsx`.
- **Details Screen (PYQ Details Page)**: Must replicate the exact design, theme, and component structure of `CourseDetailScreen.tsx`. It will utilize all backend metrics available for PYQs.

## 2. PYQ List Screen (Replacing `MockTestsTabScreen`)
The current glassmorphism card design in `MockTestsTabScreen` will be replaced entirely by the `CoursesScreen` design structure.

### 2.1 Layout & Components
- **Header & Search**: Implement the sticky header with the animated search bar and filter button, identically to `CoursesScreen.tsx`.
- **Collapsible Filter Panel**: Keep the exact same filter UI and animations from the courses page to increase code reusability. Use the `CategoryChipStrip` (for Streams/Subjects) and `SortPillsRow` (for Popularity, Price, Year Range).
- **Hero Carousel (Featured PYQs)**: Show trending or "Spotlight" PYQ packages using a carousel.
- **My Learning Row**: Add a "My Purchased PYQs" row below the featured carousel, mirroring the "My Active Batches" row.
- **Grid Catalog**: Render the remaining PYQ packages using the reusable generic large and compact cards.
- **Empty/Loading States**: Use the generic skeleton and empty state components.

### 2.2 Data Mapping (`PracticePackage` -> UI)
- `title` <- `pkg.name`
- `category` <- `pkg.streamName`
- `price` <- `pkg.price`
- `originalPrice` <- `pkg.originalPrice`
- `imageUrl` <- `pkg.thumbnailUrl`
- `description` <- `pkg.description`
- `badgeLabel` <- `pkg.badgeLabel` (e.g., "Most Attempted")
- Additional meta info (like duration/student count) on the card can be adapted to show `pkg.totalPapers` and `pkg.yearFrom`–`pkg.yearTo`.

## 3. PYQ Details Screen
A new screen (or redesigned `ExamPackDetailScreen`) must be created mimicking `CourseDetailScreen.tsx`.

### 3.1 Layout & Components
- **Hero Section**: Show the package title, thumbnail, stream, and primary CTA.
- **Metric Grid**: Use `MetricGridItem` to display key stats.
- **Curriculum / Papers List**: Use the `CurriculumAccordion` pattern to display the list of `PracticePaper`s. The papers will be **grouped** (e.g., by Year) so that the accordion UI structure maps perfectly.
- **Sticky Footer (Purchase CTA)**: Implement the exact animated sticky footer used in course details for the "Buy Now" / "Start Practice" button with the price display.

### 3.2 Backend Data Utilization (`PracticeDetail` -> UI)
*Based on the schema in `src/types/practice.ts`:*
- **Hero Details**: `name`, `description`, `thumbnailUrl`, `badgeLabel`.
- **Metrics Grid**:
  1. **Papers**: `totalPapers` (Icon: document/file)
  2. **Year Range**: `yearFrom` to `yearTo` (Icon: calendar)
  3. **Stream**: `streamName` (Icon: tag/bookmark)
  4. **Cost**: Free vs Paid status (Icon: tag)
- **Paper List (Grouped Accordion)**:
  Group `PracticePaper` array by `examYear`. Each year becomes an accordion header. Each paper row will display:
  - `title`
  - `examYear` / `examSession`
  - `totalQuestions` questions • `durationMin` mins • `totalMarks` marks
  - Lock/Unlock state based on user purchase status.

## 4. Execution Steps
1. **Component Refactoring (Reusability)**: Refactor the existing Course components (e.g., `CourseCard`, `MetricGridItem`, `CategoryChipStrip`, `SortPillsRow`) to be generic and reusable so that both Courses and PYQs can utilize them without duplication. This ensures UI/animation consistency and increases code reusability.
2. **Update Navigation**: Point the "Practice" tab in `MainTabNavigator.tsx` to the new PYQ List screen.
3. **Build PYQ List Screen**: Implement the UI, integrate `usePracticeList()`, and map the data to the newly refactored generic components. Add the "My Purchased PYQs" section.
4. **Build PYQ Details Screen**: Implement the UI, integrate the detail fetching hook, map `PracticeDetail` and group `PracticePaper` by year for the accordion.
5. **Review & Polish**: Ensure animations (Reanimated), theme colors (`coursesDark`), and transitions match perfectly.
