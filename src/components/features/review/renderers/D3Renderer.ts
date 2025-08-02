import * as d3 from "d3";
import { GradeData } from '../charts/GradeDistributionChart';

export class D3Renderer {
  private svg: d3.Selection<SVGGElement, unknown, null, undefined>;
  private width: number;
  private height: number;
  private margin: { top: number; right: number; bottom: number; left: number };
  private primaryColor: string;
  private primaryHover: string;
  private isSmallScreen: boolean;

  constructor(
    container: HTMLDivElement,
    width: number,
    height: number,
    primaryColor: string,
    primaryHover: string,
    isSmallScreen: boolean
  ) {
    this.width = width;
    this.height = height;
    this.primaryColor = primaryColor;
    this.primaryHover = primaryHover;
    this.isSmallScreen = isSmallScreen;
    
    this.margin = { top: 30, right: 20, bottom: 60, left: 20 };
    this.adjustMarginsForIOS();
    
    this.svg = this.initializeSVG(container);
  }

  private adjustMarginsForIOS(): void {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && 
                 !(window as {MSStream?: unknown}).MSStream;
    if (isIOS) {
      this.margin.left = Math.max(this.margin.left, 10);
      this.margin.right = Math.max(this.margin.right, 15);
    }
  }

  private initializeSVG(container: HTMLDivElement): d3.Selection<SVGGElement, unknown, null, undefined> {
    // Clear previous chart if any
    d3.select(container).selectAll("svg").remove();
    
    const svg = d3.select(container)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${this.width} ${this.height}`)
      .attr("preserveAspectRatio", "xMidYMid meet")
      .style("max-width", "100%")
      .style("display", "block")
      .style("margin", "0 auto")
      .style("padding", /iPad|iPhone|iPod/.test(navigator.userAgent) ? "0 10px" : "0")
      .append("g")
      .attr("transform", `translate(${this.margin.left},${this.margin.top})`);

    return svg;
  }

  public renderChart(grades: GradeData[], averageGPA?: number): void {
    // Clear previous chart
    this.svg.selectAll("*").remove();
    
    const innerWidth = this.width - this.margin.left - this.margin.right;
    const innerHeight = this.height - this.margin.top - this.margin.bottom - 10;

    // Add background
    this.svg.append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", "transparent")
      .attr("rx", 4);

    // Create scales
    const x = d3.scaleBand()
      .domain(grades.map(d => d.grade))
      .range([0, innerWidth])
      .padding(0.3);

    // Find the maximum percentage value to scale the y-axis appropriately
    const maxPercentage = Math.max(...grades.map(d => d.percentage), 100);
    const y = d3.scaleLinear()
      .domain([0, maxPercentage])
      .range([innerHeight, 0]);

    // Add x-axis
    this.svg.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("font-size", "12px")
      .style("font-weight", "500");

    // Create bar groups
    const barGroups = this.svg.selectAll(".bar-group")
      .data(grades)
      .enter()
      .append("g")
      .attr("class", "bar-group")
      .attr("transform", d => `translate(${x(d.grade)!},0)`);

    // Add bars
    const bars = barGroups.append("rect")
      .attr("class", "bar")
      .attr("x", 0)
      .attr("y", innerHeight)
      .attr("width", x.bandwidth())
      .attr("height", 0)
      .attr("fill", this.primaryColor)
      .attr("rx", 6);

    // Add percentage text above bars (initially hidden)
    const percentageTexts = barGroups.append("text")
      .attr("class", "percentage-text")
      .attr("x", x.bandwidth() / 2)
      .attr("y", d => y(d.percentage) - 5)
      .attr("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "500")
      .style("fill", this.primaryColor)
      .style("opacity", 0)
      .text(d => `${d.percentage.toFixed(1)}%`);

    // Animate bars
    bars.transition()
      .duration(800)
      .delay((_, i) => i * 100)
      .attr("y", d => y(d.percentage))
      .attr("height", d => innerHeight - y(d.percentage));

    // Add average GPA circle
    const centerX = innerWidth / 2;
    const centerY = innerHeight / 2;

    this.svg.append("circle")
      .attr("cx", centerX)
      .attr("cy", centerY)
      .attr("r", 40)
      .attr("fill", "white")
      .attr("stroke", this.primaryColor)
      .attr("stroke-width", 2)
      .style("opacity", 0.9);

    this.svg.append("text")
      .attr("x", centerX)
      .attr("y", centerY - 5)
      .attr("text-anchor", "middle")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .attr("fill", this.primaryColor)
      .text("GPA");

    this.svg.append("text")
      .attr("x", centerX)
      .attr("y", centerY + 15)
      .attr("text-anchor", "middle")
      .attr("font-size", "20px")
      .attr("font-weight", "bold")
      .attr("fill", this.primaryColor)
      .text(typeof averageGPA === 'number' ? averageGPA.toFixed(2) : 'N/A');

    // Calculate percentage of B and above
    const bAndAboveGrades = ['A+', 'A', 'A-', 'B+', 'B'];
    const bAndAbovePercentage = grades
      .filter(grade => bAndAboveGrades.includes(grade.grade))
      .reduce((sum, grade) => sum + grade.percentage, 0);

    // Add text showing percentage of B and above
    this.svg.append("text")
      .attr("x", centerX)
      .attr("y", innerHeight + 40)
      .attr("text-anchor", "middle")
      .style("font-size", "14px")
      .style("font-weight", "500")
      .style("fill", this.primaryColor)
      .text(`${bAndAbovePercentage.toFixed(1)}% of students received a B or higher`);

    // Add hover effects
    this.setupHoverEffects(barGroups, innerHeight, y, percentageTexts);
  }

  private setupHoverEffects(
    barGroups: d3.Selection<SVGGElement, GradeData, SVGGElement, unknown>,
    _innerHeight: number,
    _y: d3.ScaleLinear<number, number>,
    percentageTexts: d3.Selection<SVGTextElement, GradeData, SVGGElement, unknown>
  ): void {
    barGroups.each((d, i, nodes) => {
      const barGroup = d3.select(nodes[i]);
      
      barGroup.on("mouseover", () => {
        barGroup.select(".bar")
          .transition()
          .duration(200)
          .attr("fill", this.primaryHover);

        percentageTexts.filter((_, j) => j === i)
          .transition()
          .duration(200)
          .style("opacity", 1);
      }).on("mouseout", () => {
        barGroup.select(".bar")
          .transition()
          .duration(200)
          .attr("fill", this.primaryColor);

        percentageTexts.filter((_, j) => j === i)
          .transition()
          .duration(200)
          .style("opacity", 0);
      });
    });
  }

  public getIsSmallScreen(): boolean {
    return this.isSmallScreen;
  }
} 