import { SchoolConfig } from "@/config/themes";
import { 
  hasUniversityField, 
  createUniversityAdapter 
} from "@/utils/helpers/dataHandlers";
import { ClassData } from "@/types/classes/classTypes";

export type Attribute = {
  text: string;
  group: string;
};

export const processClassAttributes = (classData: ClassData, schoolConfig: SchoolConfig): Attribute[] => {
  const attributes: Attribute[] = [];
  const getField = createUniversityAdapter(schoolConfig);
  
  // Handle credits based on school
  if (schoolConfig.shortName === 'Utah') {
    const minCredits = getField<number>(classData, 'min_credits');
    const maxCredits = getField<number>(classData, 'max_credits');
    
    if (minCredits !== undefined && maxCredits !== undefined && 
        !isNaN(minCredits) && !isNaN(maxCredits)) {
      if (minCredits === maxCredits) {
        attributes.push({
          text: `${minCredits} Credits`,
          group: 'credits'
        });
      } else {
        attributes.push({
          text: `${minCredits}-${maxCredits} Credits`,
          group: 'credits'
        });
      }
    }
  } else {
    const credits = getField<string>(classData, 'credits');
    if (credits) {
      attributes.push({
        text: `${credits} Credits`,
        group: 'credits'
      });
    }
  }
  
  // Process all attributes using the apiFields definitions
  if (schoolConfig.filters.apiFields) {
    const apiFields = schoolConfig.filters.apiFields;
    const mappings = schoolConfig.filters.mappings || {};
    
    Object.entries(apiFields).forEach(([key, fieldMapping]) => {
      if (key === 'credits') return;
      
      if (fieldMapping.apiField.includes(',')) {
        const possibleFields = fieldMapping.apiField.split(',').map(f => f.trim());
        
        const booleanAttributes = getField<string[]>(classData, 'boolean_attributes');
        if (booleanAttributes && Array.isArray(booleanAttributes)) {
          const matchingFields = possibleFields.filter(field => {
            return booleanAttributes.some((attr: string | number | boolean) => 
              typeof attr === 'string' && attr === field
            );
          });
          
          matchingFields.forEach(field => {
            if (mappings[key] && mappings[key][field]) {
              attributes.push({
                text: field,
                group: key
              });
            } else {
              attributes.push({
                text: field,
                group: key
              });
            }
          });
        }
        
        possibleFields.forEach(field => {
          if (hasUniversityField(classData, field, schoolConfig) && 
              getField<boolean>(classData, field) === true) {
            attributes.push({
              text: field,
              group: key
            });
          }
        });
      } else {
        const apiFieldValue = getField(classData, fieldMapping.apiField);
        
        if (apiFieldValue === undefined || apiFieldValue === null || apiFieldValue === '') {
          return;
        }
        
        const transformedValue = fieldMapping.transform 
          ? fieldMapping.transform(apiFieldValue) 
          : apiFieldValue;
        
        if (Array.isArray(transformedValue)) {
          transformedValue.forEach(val => {
            if (typeof val === 'number' && mappings[key]) {
              const reversedMapping = Object.entries(mappings[key] || {}).reduce((acc, [uiName, apiVal]) => {
                acc[apiVal] = uiName;
                return acc;
              }, {} as Record<number, string>);
              
              const uiName = reversedMapping[val];
              if (uiName) {
                attributes.push({
                  text: uiName,
                  group: key
                });
              }
            } else if (typeof val === 'string') {
              attributes.push({
                text: val,
                group: key
              });
            }
          });
        } else if (typeof transformedValue === 'boolean' && transformedValue === true) {
          const filterGroup = schoolConfig.filters.groups.find(g => g.key === key);
          if (filterGroup) {
            const displayName = filterGroup.title || key;
            attributes.push({
              text: displayName,
              group: key
            });
          }
        } else if (typeof transformedValue === 'number' && mappings[key]) {
          const reversedMapping = Object.entries(mappings[key] || {}).reduce((acc, [uiName, apiVal]) => {
            acc[apiVal] = uiName;
            return acc;
          }, {} as Record<number, string>);
          
          const uiName = reversedMapping[transformedValue];
          if (uiName) {
            attributes.push({
              text: uiName,
              group: key
            });
          }
        } else if (typeof transformedValue === 'string') {
          attributes.push({
            text: transformedValue,
            group: key
          });
        }
      }
    });
    
    // Handle boolean attributes
    const booleanAttributes = getField<string[]>(classData, 'boolean_attributes');
    if (booleanAttributes && Array.isArray(booleanAttributes)) {
      const processedAttributes = attributes.map(a => a.text);
      
      const unprocessedAttributes = booleanAttributes
        .filter((attr): attr is string => typeof attr === 'string')
        .filter(attr => !processedAttributes.includes(attr));
      
      unprocessedAttributes.forEach(attr => {
        for (const group of schoolConfig.filters.groups) {
          if (group.filters.includes(attr)) {
            attributes.push({
              text: attr,
              group: group.key
            });
            break;
          }
        }
      });
    }
    
    // Handle direct boolean properties
    schoolConfig.filters.groups.forEach(group => {
      group.filters.forEach(filter => {
        if (attributes.some(a => a.text === filter)) return;
        
        if (hasUniversityField(classData, filter, schoolConfig) && 
            getField<boolean>(classData, filter) === true) {
          attributes.push({
            text: filter,
            group: group.key
          });
        }
      });
    });
  }
  
  // Handle prerequisites
  const requisites = getField<string>(classData, 'requisites');
  if (!requisites || requisites.trim() === '') {
    attributes.push({
      text: 'No Prerequisites',
      group: 'prerequisites'
    });
  }
  
  // Remove duplicates
  return attributes.filter((attr, index, self) => 
    index === self.findIndex(a => a.text === attr.text)
  );
}; 