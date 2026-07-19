import React, { createContext, useContext, ReactNode } from 'react';
import { useSharedValue, SharedValue } from 'react-native-reanimated';

export interface TabScrollContextValue {
  tabBarTranslateY: SharedValue<number>;
}

const TabScrollContext = createContext<TabScrollContextValue | null>(null);

export function useTabScrollContext(): TabScrollContextValue | null {
  return useContext(TabScrollContext);
}

export function TabScrollProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const tabBarTranslateY = useSharedValue(0);

  return (
    <TabScrollContext.Provider value={{ tabBarTranslateY }}>
      {children}
    </TabScrollContext.Provider>
  );
}
