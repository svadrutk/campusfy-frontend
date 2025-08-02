import { schoolConfigs } from "@/config/themes";

export class ThemeManager {
  private schoolTheme: string;

  constructor(schoolTheme: string) {
    this.schoolTheme = schoolTheme;
  }

  public getThemeColors(): { primary: string; primaryHover: string } {
    return schoolConfigs[this.schoolTheme]?.colors || schoolConfigs.wisco.colors;
  }

  public getPrimaryColor(): string {
    return this.getThemeColors().primary;
  }

  public getPrimaryHoverColor(): string {
    return this.getThemeColors().primaryHover;
  }
} 